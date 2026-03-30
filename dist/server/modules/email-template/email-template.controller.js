"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateController = void 0;
const tslib_1 = require("tslib");
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const email_template_service_1 = require("./email-template.service");
let EmailTemplateController = class EmailTemplateController {
    emailTemplateService;
    constructor(emailTemplateService) {
        this.emailTemplateService = emailTemplateService;
    }
    async getTemplates() {
        return this.emailTemplateService.getTemplates();
    }
    async createTemplate(body) {
        return this.emailTemplateService.createTemplate(body);
    }
    async deleteTemplate(id) {
        if (!id) {
            throw new common_1.BadRequestException('请提供模板ID');
        }
        return this.emailTemplateService.deleteTemplate(id);
    }
};
exports.EmailTemplateController = EmailTemplateController;
tslib_1.__decorate([
    (0, common_1.Get)(),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", []),
    tslib_1.__metadata("design:returntype", Promise)
], EmailTemplateController.prototype, "getTemplates", null);
tslib_1.__decorate([
    (0, common_1.Post)(),
    openapi.ApiResponse({ status: 201, type: Object }),
    tslib_1.__param(0, (0, common_1.Body)()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object]),
    tslib_1.__metadata("design:returntype", Promise)
], EmailTemplateController.prototype, "createTemplate", null);
tslib_1.__decorate([
    (0, common_1.Delete)(':id'),
    openapi.ApiResponse({ status: 200, type: Object }),
    tslib_1.__param(0, (0, common_1.Param)('id')),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [String]),
    tslib_1.__metadata("design:returntype", Promise)
], EmailTemplateController.prototype, "deleteTemplate", null);
exports.EmailTemplateController = EmailTemplateController = tslib_1.__decorate([
    (0, common_1.Controller)('api/email-templates'),
    tslib_1.__metadata("design:paramtypes", [email_template_service_1.EmailTemplateService])
], EmailTemplateController);
