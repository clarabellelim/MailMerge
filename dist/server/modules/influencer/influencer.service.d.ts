import { type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import type { InfluencerListResp, InfluencerUpdateReq, InfluencerUpdateResp, InfluencerUploadResp, Influencer } from '@shared/api.interface';
export declare class InfluencerService {
    private readonly db;
    private readonly logger;
    private readonly memInfluencers;
    constructor(db: PostgresJsDatabase);
    private isDbAvailable;
    getInfluencers(page?: number, pageSize?: number, verified?: boolean): Promise<InfluencerListResp>;
    getInfluencersByIds(ids: string[]): Promise<Influencer[]>;
    updateInfluencer(id: string, data: InfluencerUpdateReq): Promise<InfluencerUpdateResp>;
    uploadCsv(csvContent: string): Promise<InfluencerUploadResp>;
    uploadFile(file: any): Promise<InfluencerUploadResp>;
    private uploadRows;
    private parseCsvLine;
    private mapToInfluencer;
}
