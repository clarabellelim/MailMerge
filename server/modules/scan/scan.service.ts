import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { influencer } from '../../database/schema';
import type {
  ScanStartResp,
  ScanStatusResp,
  CsvExportRow,
} from '@shared/api.interface';
import { chromium, type Page, type BrowserContext } from 'playwright';
import { scrapeInfluencerFromUrl, type ScrapeInfluencerResult } from './scraper/scrapeInfluencer';
import { detectPlatformByUrl, type Platform } from './scraper/platformDetect';

interface ScanTask {
  taskId: string;
  total: number;
  urls: string[];
  completed: number;
  currentVideo?: string;
  retryCount: number;
  failedSubPages: number;
  status: 'running' | 'completed' | 'failed';
  results: CsvExportRow[];
}

const MAX_PROFILE_ATTEMPTS = 2; // first try + 1 retry
const MAX_KEYWORD_RESULTS = 500;

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  private tasks: Map<string, ScanTask> = new Map();

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async startScan(
    urls: string[],
  ): Promise<ScanStartResp> {
    const taskId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: ScanTask = {
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

  async startKeywordScan(input: {
    keyword: string;
    platform: 'tiktok' | 'instagram' | 'youtube';
    maxResults: number;
  }): Promise<ScanStartResp> {
    const maxResults = Math.min(Math.max(1, input.maxResults), MAX_KEYWORD_RESULTS);
    const taskId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: ScanTask = {
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

  getScanStatus(taskId: string): ScanStatusResp | null {
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

  getScanResults(taskId: string): CsvExportRow[] | null {
    const task = this.tasks.get(taskId);
    if (!task) {
      return null;
    }
    return task.results;
  }

  private async runScan(task: ScanTask): Promise<void> {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();

      for (const profileUrl of task.urls) {
        task.currentVideo = profileUrl;

        let scraped: ScrapeInfluencerResult | null = null;
        for (let attempt = 0; attempt < MAX_PROFILE_ATTEMPTS; attempt++) {
          let page: Page | null = null;
          try {
            page = await context.newPage();
            scraped = await scrapeInfluencerFromUrl(page, profileUrl);
            await page.close().catch(() => {});
            break;
          } catch (error) {
            this.logger.warn(`Scrape failed: ${profileUrl} (attempt ${attempt + 1}/${MAX_PROFILE_ATTEMPTS})`);
            task.retryCount++;
            await page?.close().catch(() => {});

            // Wait before retrying
            await this.randomSleep(2000, 4000);

            if (attempt === MAX_PROFILE_ATTEMPTS - 1) {
              scraped = null;
            }
          }
        }

        // Best-effort fallback when we cannot even load the profile page.
        if (!scraped) {
          const platformDetected = detectPlatformByUrl(profileUrl) ?? 'youtube';
          const handle = (() => {
            try {
              const u = new URL(profileUrl);
              const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
              const first = parts[0] || 'unknown';
              return first.startsWith('@') ? first.slice(1) : first;
            } catch {
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
    } catch (error) {
      this.logger.error(`扫描任务执行失败:`, error);
      task.status = 'failed';
    } finally {
      await browser?.close().catch(() => {});
    }
  }

  private async runKeywordScan(
    task: ScanTask,
    input: { keyword: string; platform: 'tiktok' | 'instagram' | 'youtube'; maxResults: number },
  ): Promise<void> {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();

      // 1) Discover creator profile URLs by keyword search
      task.currentVideo = `search:${input.platform}:${input.keyword}`;
      let discoveredCreators: { profileUrl: string; videoUrl: string }[] = [];
      if (input.platform === 'tiktok') {
        discoveredCreators = await this.discoverTikTokCreators(page, input.keyword, input.maxResults);
      } else {
        throw new Error(`Keyword scan for ${input.platform} not implemented yet (TikTok first)`);
      }

      const videoByProfileUrl = new Map(discoveredCreators.map((d) => [d.profileUrl, d.videoUrl]));
      task.urls = discoveredCreators.map((d) => d.profileUrl);
      task.total = task.urls.length;

      // 2) Scrape each discovered creator profile
      for (const profileUrl of task.urls) {
        task.currentVideo = profileUrl;
        const scraped = await this.scrapeWithRetries(context, task, profileUrl);

        if (scraped.scanStatus === 'partial' && scraped.failedSubPage) task.failedSubPages++;

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
    } catch (error) {
      this.logger.error(`关键词扫描任务执行失败:`, error);
      task.status = 'failed';
    } finally {
      await browser?.close().catch(() => {});
    }
  }

  private async scrapeWithRetries(
    context: BrowserContext,
    task: ScanTask,
    profileUrl: string,
  ): Promise<ScrapeInfluencerResult> {
    let scraped: ScrapeInfluencerResult | null = null;
    for (let attempt = 0; attempt < MAX_PROFILE_ATTEMPTS; attempt++) {
      let page: Page | null = null;
      try {
        page = await context.newPage();
        scraped = await scrapeInfluencerFromUrl(page, profileUrl);
        await page.close().catch(() => {});
        break;
      } catch {
        task.retryCount++;
        await page?.close().catch(() => {});
        await this.randomSleep(2000, 4000);
        if (attempt === MAX_PROFILE_ATTEMPTS - 1) scraped = null;
      }
    }

    if (scraped) return scraped;

    // Fallback on total failure
    const platformDetected = detectPlatformByUrl(profileUrl) ?? 'tiktok';
    const handle = (() => {
      try {
        const u = new URL(profileUrl);
        const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
        const first = parts[0] || 'unknown';
        return first.startsWith('@') ? first.slice(1) : first;
      } catch {
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

  private async discoverTikTokCreators(
    page: Page,
    keyword: string,
    maxResults: number,
  ): Promise<{ profileUrl: string; videoUrl: string }[]> {
    const q = encodeURIComponent(keyword);
    const searchUrl = `https://www.tiktok.com/search?q=${q}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const creators = new Map<string, { profileUrl: string; videoUrl: string }>();
    let stableRounds = 0;

    while (creators.size < maxResults && stableRounds < 8) {
      const before = creators.size;

      const found = await page.evaluate(() => {
        type Found = { handle: string; profileUrl: string; videoUrl: string };
        const out: Found[] = [];
        const anchors = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
        for (const a of anchors) {
          const href = a.getAttribute('href') || '';
          if (!href) continue;

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
        } else if (!existing.videoUrl && item.videoUrl) {
          existing.videoUrl = item.videoUrl;
        }
      }

      // Scroll to load more
      await page.mouse.wheel(0, 2400);
      await page.waitForTimeout(1200);

      if (creators.size === before) stableRounds++;
      else stableRounds = 0;
    }

    return Array.from(creators.values()).slice(0, maxResults);
  }

  private async saveToDatabase(data: ScrapeInfluencerResult): Promise<void> {
    try {
      await this.db.insert(influencer).values({
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
    } catch (error) {
      this.logger.error('保存到数据库失败:', error);
    }
  }

  private async randomSleep(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
