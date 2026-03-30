"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSendModule = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const email_send_controller_1 = require("./email-send.controller");
const email_send_service_1 = require("./email-send.service");
const axios_1 = require("@nestjs/axios");
const auth_module_1 = require("../auth/auth.module");
const influencer_module_1 = require("../influencer/influencer.module");
const email_template_module_1 = require("../email-template/email-template.module");
let EmailSendModule = class EmailSendModule {
};
exports.EmailSendModule = EmailSendModule;
exports.EmailSendModule = EmailSendModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule, auth_module_1.AuthModule, influencer_module_1.InfluencerModule, email_template_module_1.EmailTemplateModule],
        controllers: [email_send_controller_1.EmailSendController],
        providers: [email_send_service_1.EmailSendService],
    })
], EmailSendModule);
