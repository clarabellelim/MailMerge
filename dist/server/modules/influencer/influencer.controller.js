"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfluencerController = void 0;
const tslib_1 = require("tslib");
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const influencer_service_1 = require("./influencer.service");
let InfluencerController = class InfluencerController {
    influencerService;
    constructor(influencerService) {
        this.influencerService = influencerService;
    }
    async getInfluencers(pageStr, pageSizeStr, verifiedStr) {
        const page = pageStr ? parseInt(pageStr, 10) : 1;
        const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 20;
        const verified = verifiedStr !== undefined
            ? verifiedStr === 'true'
            : undefined;
        if (isNaN(page) || page < 1) {
            throw new common_1.BadRequestException('页码必须是正整数');
        }
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            throw new common_1.BadRequestException('每页数量必须是1-100之间的整数');
        }
        return this.influencerService.getInfluencers(page, pageSize, verified);
    }
    async updateInfluencer(id, body) {
        if (!id) {
            throw new common_1.BadRequestException('请提供记录ID');
        }
        return this.influencerService.updateInfluencer(id, body);
    }
    async uploadFile(file, csvContent) {
        // Backward-compatible: allow sending raw CSV text
        if (!file) {
            if (!csvContent || typeof csvContent !== 'string') {
                throw new common_1.BadRequestException('请上传 .csv 或 .xlsx 文件（或提供csv文本）');
            }
            return this.influencerService.uploadCsv(csvContent);
        }
        return this.influencerService.uploadFile(file);
    }
};
exports.InfluencerController = InfluencerController;
tslib_1.__decorate([
    (0, common_1.Get)(),
    openapi.ApiResponse({ status: 200, type: Object }),
    tslib_1.__param(0, (0, common_1.Query)('page')),
    tslib_1.__param(1, (0, common_1.Query)('pageSize')),
    tslib_1.__param(2, (0, common_1.Query)('verified')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], InfluencerController.prototype, "getInfluencers", null);
tslib_1.__decorate([
    (0, common_1.Patch)(':id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], InfluencerController.prototype, "updateInfluencer", null);
tslib_1.__decorate([
    (0, common_1.Post)('upload'),
    (0, common_2.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    })),
    openapi.ApiResponse({ status: 201, type: Object }),
    tslib_1.__param(0, (0, common_2.UploadedFile)()),
    tslib_1.__param(1, (0, common_1.Body)('csv')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String]),
    tslib_1.__metadata("design:returntype", Promise)
], InfluencerController.prototype, "uploadFile", null);
exports.InfluencerController = InfluencerController = tslib_1.__decorate([
    (0, common_1.Controller)('api/influencers'),
    tslib_1.__metadata("design:paramtypes", [influencer_service_1.InfluencerService])
], InfluencerController);
