import type { Page } from 'playwright';
import { type Platform } from './platformDetect';
export type ScanStatus = 'complete' | 'partial' | 'failed';
export interface ScrapeInfluencerResult {
    scanStatus: ScanStatus;
    failedSubPage: boolean;
    handle: string;
    platform: Platform;
    followers: number;
    engagementRate: number;
    bio: string;
    emailFound: string | null;
    contactLinkFallback: string | null;
}
export declare function scrapeInfluencerFromUrl(page: Page, profileUrl: string): Promise<ScrapeInfluencerResult>;
