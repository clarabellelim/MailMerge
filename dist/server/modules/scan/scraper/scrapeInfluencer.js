"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeInfluencerFromUrl = scrapeInfluencerFromUrl;
const platformDetect_1 = require("./platformDetect");
const emailExtract_1 = require("./emailExtract");
const linktreeExtract_1 = require("./linktreeExtract");
function deriveHandleFromUrl(profileUrl, platform) {
    try {
        const u = new URL(profileUrl);
        const path = u.pathname.replace(/\/+$/, '');
        const parts = path.split('/').filter(Boolean);
        // Common patterns:
        // - YouTube: /@handle, /c/brand, /channel/xxxx
        // - Instagram: /username
        // - TikTok: /@username
        const first = parts[0] || '';
        if (platform === 'youtube') {
            if (first.startsWith('@'))
                return first.slice(1);
            if (first === 'c' || first === 'channel')
                return parts[1] || 'unknown';
            return first || 'unknown';
        }
        if (first.startsWith('@'))
            return first.slice(1);
        return first || 'unknown';
    }
    catch {
        return 'unknown';
    }
}
function parseFollowersFromText(text) {
    // Very best-effort: try to find a nearby "followers" / "粉丝" token.
    // Example matches: "12,345 followers", "12.3M followers", "1.2万粉丝"
    const normalized = text.replace(/,/g, '').replace(/\u00A0/g, ' ').trim();
    const re = /([\d.]+)\s*(?:followers|follower|粉丝)/i;
    const m = normalized.match(re);
    if (!m) {
        // Sometimes TikTok only renders the number (or the token isn't in innerText).
        // Best-effort numeric parsing with k/m/万 suffix support.
        const ms = normalized.match(/([\d.]+)\s*(k|m|万)/i);
        if (ms) {
            const value = parseFloat(ms[1]);
            const suffix = ms[2].toLowerCase();
            if (Number.isNaN(value))
                return 0;
            if (suffix === 'k')
                return Math.round(value * 1_000);
            if (suffix === 'm')
                return Math.round(value * 1_000_000);
            if (suffix === '万')
                return Math.round(value * 10_000);
        }
        const numOnly = normalized.match(/([\d.]+)/);
        if (!numOnly)
            return 0;
        const parsedOnly = parseFloat(numOnly[1]);
        return Number.isFinite(parsedOnly) ? Math.round(parsedOnly) : 0;
    }
    const num = m[1];
    if (!num)
        return 0;
    // Handle M/k suffixes if they appear in the original token nearby (we keep it simple for MVP).
    const reSuffix = /([\d.]+)\s*(k|m|万)\s*(?:followers|follower|粉丝)/i;
    const ms = normalized.match(reSuffix);
    if (ms) {
        const value = parseFloat(ms[1]);
        const suffix = ms[2].toLowerCase();
        if (Number.isNaN(value))
            return 0;
        if (suffix === 'k')
            return Math.round(value * 1_000);
        if (suffix === 'm')
            return Math.round(value * 1_000_000);
        if (suffix === '万')
            return Math.round(value * 10_000);
    }
    const parsed = parseFloat(num);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}
function parseEngagementRateFromText(text) {
    // Best-effort: first percentage number.
    const m = text.match(/([\d.]+)\s*%/);
    if (!m)
        return 0;
    const value = parseFloat(m[1]);
    return Number.isFinite(value) ? value : 0;
}
async function scrapeInfluencerFromUrl(page, profileUrl) {
    const platform = (0, platformDetect_1.detectPlatformByUrl)(profileUrl);
    if (!platform) {
        throw new Error('Unsupported platform (cannot detect from URL domain)');
    }
    const handle = deriveHandleFromUrl(profileUrl, platform);
    // 1) Load profile page (profile navigation failure should mark scan as failed)
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // TikTok content is heavily client-rendered; wait a bit + trigger lazy rendering.
    await page.waitForTimeout(2500);
    try {
        await page.waitForFunction(() => (document.body?.innerText || '').trim().length > 150, { timeout: 10000 });
    }
    catch {
        // Ignore; we'll fall back to whatever content we managed to render.
    }
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(1200);
    // 2) Extract bio and full visible text for email/number best-effort parsing
    const { bio, pageText, followersText, fallbackHref } = await page.evaluate(() => {
        const metaDesc = document.querySelector('meta[name="description"]')?.content ||
            document.querySelector('meta[property="og:description"]')?.content ||
            '';
        const bioEl = document.querySelector('[data-e2e="user-bio"]') ||
            document.querySelector('[data-e2e="bio"]');
        const followerEl = document.querySelector('[data-e2e="followers-count"]') ||
            document.querySelector('[data-e2e="followers"]');
        const fallbackDomainRe = /linktr\.ee|beacons\.ai|carrd\.co|podia\.com/i;
        const fallbackA = Array.from(document.querySelectorAll('a[href]')).find((a) => {
            const href = a.getAttribute('href') || '';
            return fallbackDomainRe.test(href);
        });
        const fallbackHref = fallbackA?.getAttribute('href')
            ? new URL(fallbackA.getAttribute('href') || '', window.location.origin).toString()
            : null;
        const text = (document.body?.innerText || '').slice(0, 20000);
        return {
            bio: (bioEl?.innerText || metaDesc).trim(),
            pageText: text,
            followersText: followerEl?.innerText || '',
            fallbackHref,
        };
    });
    const followers = parseFollowersFromText(followersText || pageText);
    const engagementRate = parseEngagementRateFromText(pageText);
    const emailFoundFromBio = (0, emailExtract_1.extractFirstValidEmail)(bio || pageText);
    const contactLinkFallback = (0, linktreeExtract_1.normalizeFallbackLink)((0, linktreeExtract_1.extractFallbackLink)(bio || pageText) || fallbackHref);
    // If email found on profile page, we are done (complete).
    if (emailFoundFromBio) {
        return {
            scanStatus: 'complete',
            failedSubPage: false,
            handle,
            platform,
            followers,
            engagementRate,
            bio: bio || '',
            emailFound: emailFoundFromBio,
            contactLinkFallback,
        };
    }
    // 3) Fallback: navigate to linktree-type URL and look for mailto links / emails.
    if (contactLinkFallback) {
        try {
            await page.goto(contactLinkFallback, {
                waitUntil: 'domcontentloaded',
                timeout: 20000,
            });
            await page.waitForTimeout(2000);
            const { pageText2, mailtoHrefs } = await page.evaluate(() => {
                const text = (document.body?.innerText || '').slice(0, 20000);
                const hrefs = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
                const mails = hrefs.map((a) => a.getAttribute('href') || '').filter(Boolean);
                return { pageText2: text, mailtoHrefs: mails };
            });
            const emailsFromMailto = (0, emailExtract_1.extractEmailsFromMailtoHrefs)(mailtoHrefs);
            const emailFoundFromBody = (0, emailExtract_1.extractFirstValidEmail)(pageText2);
            const emailFound = emailsFromMailto[0] || emailFoundFromBody;
            return {
                // Fallback navigation succeeded; only consider this "partial" when the navigation itself fails.
                scanStatus: 'complete',
                failedSubPage: false,
                handle,
                platform,
                followers,
                engagementRate,
                bio: bio || '',
                emailFound,
                contactLinkFallback,
            };
        }
        catch {
            // Sub-page navigation failure => partial
            return {
                scanStatus: 'partial',
                failedSubPage: true,
                handle,
                platform,
                followers,
                engagementRate,
                bio: bio || '',
                emailFound: null,
                contactLinkFallback,
            };
        }
    }
    // No email, no fallback link: treat as complete but with empty email.
    return {
        scanStatus: 'complete',
        failedSubPage: false,
        handle,
        platform,
        followers,
        engagementRate,
        bio: bio || '',
        emailFound: null,
        contactLinkFallback: null,
    };
}
