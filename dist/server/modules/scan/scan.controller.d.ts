import type { Response } from 'express';
import { ScanService } from './scan.service';
import type { ScanStartReq, ScanKeywordStartReq, ScanStartResp, ScanStatusResp } from '@shared/api.interface';
export declare class ScanController {
    private readonly scanService;
    constructor(scanService: ScanService);
    startScan(body: ScanStartReq): Promise<ScanStartResp>;
    startKeywordScan(body: ScanKeywordStartReq): Promise<ScanStartResp>;
    getStatus(taskId: string): Promise<ScanStatusResp>;
    downloadExcel(taskId: string, res: Response): Promise<void>;
    private generateExcel;
}
