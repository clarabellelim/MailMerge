"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSendController = void 0;
const tslib_1 = require("tslib");
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const email_send_service_1 = require("./email-send.service");
let EmailSendController = class EmailSendController {
    emailSendService;
    constructor(emailSendService) {
        this.emailSendService = emailSendService;
    }
    async startSend(body, req) {
        // In local MVP/dev mode we allow starting without platform login.
        // Use the same fallback userId as /api/auth/status so memTokens can be found.
        const userId = req.userContext?.userId || 'local-dev';
        // Sending can still fail later if Feishu OAuth isn't configured for this userId.
        if (!body.influencerIds || !Array.isArray(body.influencerIds) || body.influencerIds.length === 0) {
            throw new common_1.BadRequestException('请提供有效的网红ID列表');
        }
        if (!body.templateId) {
            throw new common_1.BadRequestException('请提供邮件模板ID');
        }
        return this.emailSendService.startSend(body.influencerIds, body.templateId, userId || '');
    }
    async getSendStatus(taskId) {
        if (!taskId) {
            throw new common_1.BadRequestException('请提供任务ID');
        }
        const status = this.emailSendService.getSendStatus(taskId);
        if (!status) {
            throw new common_1.NotFoundException('任务不存在');
        }
        return status;
    }
};
exports.EmailSendController = EmailSendController;
tslib_1.__decorate([
    (0, common_1.Post)('send'),
    openapi.ApiResponse({ status: 201, type: Object }),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], EmailSendController.prototype, "startSend", null);
tslib_1.__decorate([
    (0, common_1.Get)('send-status'),
    openapi.ApiResponse({ status: 200, type: Object }),
    tslib_1.__param(0, (0, common_1.Query)('taskId')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], EmailSendController.prototype, "getSendStatus", null);
exports.EmailSendController = EmailSendController = tslib_1.__decorate([
    (0, common_1.Controller)('api/email'),
    tslib_1.__metadata("design:paramtypes", [email_send_service_1.EmailSendService])
], EmailSendController);
