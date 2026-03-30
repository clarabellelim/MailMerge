import { type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import type { ScanStartResp, ScanStatusResp, CsvExportRow } from '@shared/api.interface';
export declare class ScanService {
    private readonly db;
    private readonly logger;
    private tasks;
    constructor(db: PostgresJsDatabase);
    startScan(urls: string[]): Promise<ScanStartResp>;
    startKeywordScan(input: {
        keyword: string;
        platform: 'tiktok' | 'instagram' | 'youtube';
        maxResults: number;
    }): Promise<ScanStartResp>;
    getScanStatus(taskId: string): ScanStatusResp | null;
    getScanResults(taskId: string): CsvExportRow[] | null;
    private runScan;
    private runKeywordScan;
    private scrapeWithRetries;
    private discoverTikTokCreators;
    private saveToDatabase;
    private randomSleep;
}
