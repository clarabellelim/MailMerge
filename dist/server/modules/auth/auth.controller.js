"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const tslib_1 = require("tslib");
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    getUserIdOrLocal(req) {
        return req.userContext?.userId || 'local-dev';
    }
    async getStatus(req) {
        // Local dev: allow status check without platform login.
        return this.authService.getAuthStatus(this.getUserIdOrLocal(req));
    }
    getConfigStatus() {
        return this.authService.getAuthConfigStatus();
    }
    getAuthUrl() {
        return this.authService.getAuthUrl();
    }
    async handleCallback(code, req) {
        if (!code) {
            throw new common_1.BadRequestException('缺少授权码');
        }
        const success = await this.authService.handleCallback(code, this.getUserIdOrLocal(req));
        return { success };
    }
};
exports.AuthController = AuthController;
tslib_1.__decorate([
    (0, common_1.Get)('status'),
    openapi.ApiResponse({ status: 200, type: Object }),
    tslib_1.__param(0, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthController.prototype, "getStatus", null);
tslib_1.__decorate([
    (0, common_1.Get)('config-status'),
    openapi.ApiResponse({ status: 200, type: Object }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Object)
], AuthController.prototype, "getConfigStatus", null);
tslib_1.__decorate([
    (0, common_1.Get)('url'),
    openapi.ApiResponse({ status: 200, type: Object }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Object)
], AuthController.prototype, "getAuthUrl", null);
tslib_1.__decorate([
    (0, common_1.Get)('callback'),
    openapi.ApiResponse({ status: 200, type: Object }),
    tslib_1.__param(0, (0, common_1.Query)('code')),
    tslib_1.__param(1, (0, common_1.Req)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthController.prototype, "handleCallback", null);
exports.AuthController = AuthController = tslib_1.__decorate([
    (0, common_1.Controller)('api/auth'),
    tslib_1.__metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
