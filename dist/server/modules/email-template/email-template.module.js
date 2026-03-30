"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateModule = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const email_template_controller_1 = require("./email-template.controller");
const email_template_service_1 = require("./email-template.service");
let EmailTemplateModule = class EmailTemplateModule {
};
exports.EmailTemplateModule = EmailTemplateModule;
exports.EmailTemplateModule = EmailTemplateModule = tslib_1.__decorate([
    (0, common_1.Module)({
        controllers: [email_template_controller_1.EmailTemplateController],
        providers: [email_template_service_1.EmailTemplateService],
        exports: [email_template_service_1.EmailTemplateService],
    })
], EmailTemplateModule);
