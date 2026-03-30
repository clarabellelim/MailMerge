"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPlatformByUrl = detectPlatformByUrl;
function detectPlatformByUrl(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        if (host.includes('youtube.com') || host.includes('youtu.be'))
            return 'youtube';
        if (host.includes('instagram.com'))
            return 'instagram';
        if (host.includes('tiktok.com'))
            return 'tiktok';
        return null;
    }
    catch {
        return null;
    }
}
