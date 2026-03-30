"use strict";
var ScanService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanService = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const fullstack_nestjs_core_1 = require("@lark-apaas/fullstack-nestjs-core");
const schema_1 = require("../../database/schema");
const playwright_1 = require("playwright");
const scrapeInfluencer_1 = require("./scraper/scrapeInfluencer");
const platformDetect_1 = require("./scraper/platformDetect");
const MAX_PROFILE_ATTEMPTS = 2; // first try + 1 retry
const MAX_KEYWORD_RESULTS = 500;
let ScanService = ScanService_1 = class ScanService {
    db;
    logger = new common_1.Logger(ScanService_1.name);
    tasks = new Map();
    constructor(db) {
        this.db = db;
    }
    async startScan(urls) {
        const taskId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const task = {
            taskId,
            total: urls.length,
            urls,
            completed: 0,
            currentVideo: '',
            retryCount: 0,
            failedSubPages: 0,
            status: 'running',
            results: [],
        };
        this.tasks.set(taskId, task);
        // 异步执行扫描
        this.runScan(task).catch((error) => {
            this.logger.error(`扫描任务 ${taskId} 失败:`, error);
            task.status = 'failed';
        });
        return { taskId };
    }
    async startKeywordScan(input) {
        const maxResults = Math.min(Math.max(1, input.maxResults), MAX_KEYWORD_RESULTS);
        const taskId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const task = {
            taskId,
            total: maxResults,
            urls: [],
            completed: 0,
            currentVideo: '',
            retryCount: 0,
            failedSubPages: 0,
            status: 'running',
            results: [],
        };
        this.tasks.set(taskId, task);
        this.runKeywordScan(task, input).catch((error) => {
            this.logger.error(`关键词扫描任务 ${taskId} 失败:`, error);
            task.status = 'failed';
        });
        return { taskId };
    }
    getScanStatus(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return null;
        }
        return {
            completed: task.completed,
            total: task.total,
            currentVideo: task.currentVideo,
            status: task.status,
            retryCount: task.retryCount,
            failedSubPages: task.failedSubPages,
        };
    }
    getScanResults(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return null;
        }
        return task.results;
    }
    async runScan(task) {
        let browser;
        try {
            browser = await playwright_1.chromium.launch({ headless: true });
            const context = await browser.newContext();
            for (const profileUrl of task.urls) {
                task.currentVideo = profileUrl;
                let scraped = null;
                for (let attempt = 0; attempt < MAX_PROFILE_ATTEMPTS; attempt++) {
                    let page = null;
                    try {
                        page = await context.newPage();
                        scraped = await (0, scrapeInfluencer_1.scrapeInfluencerFromUrl)(page, profileUrl);
                        await page.close().catch(() => { });
                        break;
                    }
                    catch (error) {
                        this.logger.warn(`Scrape failed: ${profileUrl} (attempt ${attempt + 1}/${MAX_PROFILE_ATTEMPTS})`);
                        task.retryCount++;
                        await page?.close().catch(() => { });
                        // Wait before retrying
                        await this.randomSleep(2000, 4000);
                        if (attempt === MAX_PROFILE_ATTEMPTS - 1) {
                            scraped = null;
                        }
                    }
                }
                // Best-effort fallback when we cannot even load the profile page.
                if (!scraped) {
                    const platformDetected = (0, platformDetect_1.detectPlatformByUrl)(profileUrl) ?? 'youtube';
                    const handle = (() => {
                        try {
                            const u = new URL(profileUrl);
                            const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
                            const first = parts[0] || 'unknown';
                            return first.startsWith('@') ? first.slice(1) : first;
                        }
                        catch {
                            return 'unknown';
                        }
                    })();
                    scraped = {
                        scanStatus: 'failed',
                        failedSubPage: false,
                        handle,
                        platform: platformDetected,
                        followers: 0,
                        engagementRate: 0,
                        bio: '',
                        emailFound: null,
                        contactLinkFallback: null,
                    };
                }
                if (scraped.scanStatus === 'partial' && scraped.failedSubPage) {
                    task.failedSubPages++;
                }
                task.results.push({
                    Handle: scraped.handle,
                    Platform: scraped.platform,
                    Followers: scraped.followers,
                    Email_Found: scraped.emailFound || '',
                    Contact_Link_Fallback: scraped.contactLinkFallback || '',
                    Video_Link: '',
                });
                await this.saveToDatabase(scraped);
                task.completed++;
                // Random sleep to reduce throttling / rate-limit
                await this.randomSleep(2000, 4000);
            }
            task.status = 'completed';
        }
        catch (error) {
            this.logger.error(`扫描任务执行失败:`, error);
            task.status = 'failed';
        }
        finally {
            await browser?.close().catch(() => { });
        }
    }
    async runKeywordScan(task, input) {
        let browser;
        try {
            browser = await playwright_1.chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();
            // 1) Discover creator profile URLs by keyword search
            task.currentVideo = `search:${input.platform}:${input.keyword}`;
            let discoveredCreators = [];
            if (input.platform === 'tiktok') {
                discoveredCreators = await this.discoverTikTokCreators(page, input.keyword, input.maxResults);
            }
            else {
                throw new Error(`Keyword scan for ${input.platform} not implemented yet (TikTok first)`);
            }
            const videoByProfileUrl = new Map(discoveredCreators.map((d) => [d.profileUrl, d.videoUrl]));
            task.urls = discoveredCreators.map((d) => d.profileUrl);
            task.total = task.urls.length;
            // 2) Scrape each discovered creator profile
            for (const profileUrl of task.urls) {
                task.currentVideo = profileUrl;
                const scraped = await this.scrapeWithRetries(context, task, profileUrl);
                if (scraped.scanStatus === 'partial' && scraped.failedSubPage)
                    task.failedSubPages++;
                const videoUrl = videoByProfileUrl.get(profileUrl) || '';
                task.results.push({
                    Handle: scraped.handle,
                    Platform: scraped.platform,
                    Followers: scraped.followers,
                    Email_Found: scraped.emailFound || '',
                    Contact_Link_Fallback: scraped.contactLinkFallback || '',
                    Video_Link: videoUrl,
                });
                await this.saveToDatabase(scraped);
                task.completed++;
                await this.randomSleep(2000, 4000);
            }
            task.status = 'completed';
        }
        catch (error) {
            this.logger.error(`关键词扫描任务执行失败:`, error);
            task.status = 'failed';
        }
        finally {
            await browser?.close().catch(() => { });
        }
    }
    async scrapeWithRetries(context, task, profileUrl) {
        let scraped = null;
        for (let attempt = 0; attempt < MAX_PROFILE_ATTEMPTS; attempt++) {
            let page = null;
            try {
                page = await context.newPage();
                scraped = await (0, scrapeInfluencer_1.scrapeInfluencerFromUrl)(page, profileUrl);
                await page.close().catch(() => { });
                break;
            }
            catch {
                task.retryCount++;
                await page?.close().catch(() => { });
                await this.randomSleep(2000, 4000);
                if (attempt === MAX_PROFILE_ATTEMPTS - 1)
                    scraped = null;
            }
        }
        if (scraped)
            return scraped;
        // Fallback on total failure
        const platformDetected = (0, platformDetect_1.detectPlatformByUrl)(profileUrl) ?? 'tiktok';
        const handle = (() => {
            try {
                const u = new URL(profileUrl);
                const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
                const first = parts[0] || 'unknown';
                return first.startsWith('@') ? first.slice(1) : first;
            }
            catch {
                return 'unknown';
            }
        })();
        return {
            scanStatus: 'failed',
            failedSubPage: false,
            handle,
            platform: platformDetected,
            followers: 0,
            engagementRate: 0,
            bio: '',
            emailFound: null,
            contactLinkFallback: null,
        };
    }
    async discoverTikTokCreators(page, keyword, maxResults) {
        const q = encodeURIComponent(keyword);
        const searchUrl = `https://www.tiktok.com/search?q=${q}`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const creators = new Map();
        let stableRounds = 0;
        while (creators.size < maxResults && stableRounds < 8) {
            const before = creators.size;
            const found = await page.evaluate(() => {
                const out = [];
                const anchors = Array.from(document.querySelectorAll('a[href]'));
                for (const a of anchors) {
                    const href = a.getAttribute('href') || '';
                    if (!href)
                        continue;
                    // TikTok links look like:
                    // - Video:   /@user/video/<id>...
                    // - Profile: /@user
                    const videoM = href.match(/\/@([a-zA-Z0-9._]+)\/video\//);
                    if (videoM?.[1]) {
                        const handle = videoM[1];
                        const profileUrl = `https://www.tiktok.com/@${handle}`;
                        const videoUrl = href.startsWith('http')
                            ? href
                            : `https://www.tiktok.com${href.startsWith('/') ? href : `/${href}`}`;
                        out.push({ handle, profileUrl, videoUrl });
                        continue;
                    }
                    const profileM = href.match(/\/@([a-zA-Z0-9._]+)(?:$|[/?#])/);
                    if (profileM?.[1]) {
                        const handle = profileM[1];
                        const profileUrl = `https://www.tiktok.com/@${handle}`;
                        out.push({ handle, profileUrl, videoUrl: '' });
                    }
                }
                return out;
            });
            for (const item of found) {
                const existing = creators.get(item.handle);
                if (!existing) {
                    creators.set(item.handle, { profileUrl: item.profileUrl, videoUrl: item.videoUrl || '' });
                }
                else if (!existing.videoUrl && item.videoUrl) {
                    existing.videoUrl = item.videoUrl;
                }
            }
            // Scroll to load more
            await page.mouse.wheel(0, 2400);
            await page.waitForTimeout(1200);
            if (creators.size === before)
                stableRounds++;
            else
                stableRounds = 0;
        }
        return Array.from(creators.values()).slice(0, maxResults);
    }
    async saveToDatabase(data) {
        try {
            await this.db.insert(schema_1.influencer).values({
                handle: data.handle,
                platform: data.platform,
                followers: data.followers,
                engagementRate: data.engagementRate,
                bio: data.bio || null,
                emailFound: data.emailFound,
                contactLinkFallback: data.contactLinkFallback,
                scanStatus: data.scanStatus,
                verified: false,
            });
        }
        catch (error) {
            this.logger.error('保存到数据库失败:', error);
        }
    }
    async randomSleep(min, max) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
};
exports.ScanService = ScanService;
exports.ScanService = ScanService = ScanService_1 = tslib_1.__decorate([
    (0, common_1.Injectable)(),
    tslib_1.__param(0, (0, common_1.Inject)(fullstack_nestjs_core_1.DRIZZLE_DATABASE)),
    tslib_1.__metadata("design:paramtypes", [Function])
], ScanService);
