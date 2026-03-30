import { InfluencerService } from './influencer.service';
import type { InfluencerListResp, InfluencerUpdateReq, InfluencerUpdateResp, InfluencerUploadResp } from '@shared/api.interface';
export declare class InfluencerController {
    private readonly influencerService;
    constructor(influencerService: InfluencerService);
    getInfluencers(pageStr?: string, pageSizeStr?: string, verifiedStr?: string): Promise<InfluencerListResp>;
    updateInfluencer(id: string, body: InfluencerUpdateReq): Promise<InfluencerUpdateResp>;
    uploadFile(file?: any, csvContent?: string): Promise<InfluencerUploadResp>;
}
