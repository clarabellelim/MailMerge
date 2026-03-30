"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendLogController = void 0;
const tslib_1 = require("tslib");
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const send_log_service_1 = require("./send-log.service");
let SendLogController = class SendLogController {
    sendLogService;
    constructor(sendLogService) {
        this.sendLogService = sendLogService;
    }
    async getSendLogs(pageStr, pageSizeStr, status, startTime, endTime) {
        const page = pageStr ? parseInt(pageStr, 10) : 1;
        const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 20;
        if (isNaN(page) || page < 1) {
            throw new common_1.BadRequestException('页码必须是正整数');
        }
        if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
            throw new common_1.BadRequestException('每页数量必须是1-100之间的整数');
        }
        return this.sendLogService.getSendLogs(page, pageSize, status, startTime, endTime);
    }
    async resendEmail(id, req) {
        if (!id) {
            throw new common_1.BadRequestException('请提供日志ID');
        }
        const userId = req.userContext?.userId;
        if (!userId) {
            throw new common_1.BadRequestException('未登录');
        }
        return this.sendLogService.resendEmail(id, userId);
    }
    async exportLogs(res, status, startTime, endTime) {
        const csv = await this.sendLogService.exportLogs(status, startTime, endTime);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="send_logs_${Date.now()}.csv"`);
        res.send(csv);
    }
};
exports.SendLogController = SendLogController;
tslib_1.__decorate([
    (0, common_1.Get)(),
    openapi.ApiResponse({ status: 200, type: Object }),
    tslib_1.__param(0, (0, common_1.Query)('page')),
    tslib_1.__param(1, (0, common_1.Query)('pageSize')),
    tslib_1.__param(2, (0, common_1.Query)('status')),
    tslib_1.__param(3, (0, common_1.Query)('startTime')),
    tslib_1.__param(4, (0, common_1.Query)('endTime')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, String, String, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], SendLogController.prototype, "getSendLogs", null);
tslib_1.__decorate([
    (0, common_1.Post)(':id/resend'),
    openapi.ApiResponse({ status: 201, type: Object }),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], SendLogController.prototype, "resendEmail", null);
tslib_1.__decorate([
    (0, common_1.Get)('export'),
    openapi.ApiResponse({ status: 200 }),
    tslib_1.__param(0, (0, common_1.Res)()),
    tslib_1.__param(1, (0, common_1.Query)('status')),
    tslib_1.__param(2, (0, common_1.Query)('startTime')),
    tslib_1.__param(3, (0, common_1.Query)('endTime')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], SendLogController.prototype, "exportLogs", null);
exports.SendLogController = SendLogController = tslib_1.__decorate([
    (0, common_1.Controller)('api/send-logs'),
    tslib_1.__metadata("design:paramtypes", [send_log_service_1.SendLogService])
], SendLogController);
