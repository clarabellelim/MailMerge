/**
 * TikTok sometimes wraps bio links like:
 * https://www.tiktok.com/link/v2?...&target=https%3A%2F%2Flinktr.ee%2Fhungrysam
 * For the UI/Excel we prefer the bio-looking form: linktr.ee/hungrysam
 */
export declare function normalizeFallbackLink(rawUrl: string | null | undefined): string | null;
export declare function extractFallbackLink(text: string | null | undefined): string | null;
