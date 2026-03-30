"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanController = void 0;
const tslib_1 = require("tslib");
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const scan_service_1 = require("./scan.service");
const XLSX = tslib_1.__importStar(require("xlsx"));
let ScanController = class ScanController {
    scanService;
    constructor(scanService) {
        this.scanService = scanService;
    }
    async startScan(body) {
        const urls = body.urls?.filter((u) => typeof u === 'string' && u.trim() !== '').map((u) => u.trim());
        if (!urls || urls.length === 0) {
            throw new common_1.BadRequestException('请提供至少一个有效URL');
        }
        if (urls.length > 500) {
            throw new common_1.BadRequestException('单次任务最多支持500个URL');
        }
        return this.scanService.startScan(urls);
    }
    async startKeywordScan(body) {
        const keyword = (body.keyword || '').trim();
        if (!keyword) {
            throw new common_1.BadRequestException('请提供有效关键词');
        }
        const platform = body.platform;
        if (!platform || !['tiktok', 'instagram', 'youtube'].includes(platform)) {
            throw new common_1.BadRequestException('请选择有效平台');
        }
        const maxResults = Number(body.maxResults || 0);
        if (!Number.isFinite(maxResults) || maxResults < 1 || maxResults > 500) {
            throw new common_1.BadRequestException('maxResults 必须是 1-500 之间的数字');
        }
        return this.scanService.startKeywordScan({ keyword, platform, maxResults });
    }
    async getStatus(taskId) {
        if (!taskId) {
            throw new common_1.BadRequestException('请提供任务ID');
        }
        const status = this.scanService.getScanStatus(taskId);
        if (!status) {
            throw new common_1.NotFoundException('任务不存在');
        }
        return status;
    }
    async downloadExcel(taskId, res) {
        if (!taskId) {
            throw new common_1.BadRequestException('请提供任务ID');
        }
        const results = this.scanService.getScanResults(taskId);
        if (!results) {
            throw new common_1.NotFoundException('任务不存在');
        }
        const xlsxBuffer = this.generateExcel(results);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="scan_result_${taskId}.xlsx"`);
        res.send(xlsxBuffer);
    }
    generateExcel(rows) {
        const headers = [
            'Handle',
            'Platform',
            'Followers',
            'Email_Found',
            'Contact_Link_Fallback',
            'Video_Link',
        ];
        const sheetData = rows.map((row) => ({
            Handle: row.Handle,
            Platform: row.Platform,
            Followers: row.Followers,
            Email_Found: row.Email_Found || '',
            Contact_Link_Fallback: row.Contact_Link_Fallback || '',
            Video_Link: row.Video_Link || '',
        }));
        const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Scan Results');
        return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    }
};
exports.ScanController = ScanController;
tslib_1.__decorate([
    (0, common_1.Post)('start'),
    openapi.ApiResponse({ status: 201, type: Object }),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ScanController.prototype, "startScan", null);
tslib_1.__decorate([
    (0, common_1.Post)('start-keyword'),
    openapi.ApiResponse({ status: 201, type: Object }),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ScanController.prototype, "startKeywordScan", null);
tslib_1.__decorate([
    (0, common_1.Get)('status'),
    openapi.ApiResponse({ status: 200, type: Object }),
    tslib_1.__param(0, (0, common_1.Query)('taskId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], ScanController.prototype, "getStatus", null);
tslib_1.__decorate([
    (0, common_1.Get)('download'),
    openapi.ApiResponse({ status: 200 }),
    tslib_1.__param(0, (0, common_1.Query)('taskId')),
    tslib_1.__param(1, (0, common_1.Res)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], ScanController.prototype, "downloadExcel", null);
exports.ScanController = ScanController = tslib_1.__decorate([
    (0, common_1.Controller)('api/scan'),
    tslib_1.__metadata("design:paramtypes", [scan_service_1.ScanService])
], ScanController);
