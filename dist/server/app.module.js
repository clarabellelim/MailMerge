"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const fullstack_nestjs_core_1 = require("@lark-apaas/fullstack-nestjs-core");
const exception_filter_1 = require("./common/filters/exception.filter");
const view_module_1 = require("./modules/view/view.module");
const scan_module_1 = require("./modules/scan/scan.module");
const influencer_module_1 = require("./modules/influencer/influencer.module");
const auth_module_1 = require("./modules/auth/auth.module");
const email_template_module_1 = require("./modules/email-template/email-template.module");
const email_send_module_1 = require("./modules/email-send/email-send.module");
const send_log_module_1 = require("./modules/send-log/send-log.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [
            // 平台 Module，提供平台能力
            fullstack_nestjs_core_1.PlatformModule.forRoot({ enableCsrf: false }),
            // ====== @route-section: business-modules START ======
            scan_module_1.ScanModule,
            influencer_module_1.InfluencerModule,
            auth_module_1.AuthModule,
            email_template_module_1.EmailTemplateModule,
            email_send_module_1.EmailSendModule,
            send_log_module_1.SendLogModule,
            // ====== @route-section: business-modules END ======
            // ⚠️ @route-order: last
            // ViewModule is the fallback route module, must be registered last.
            view_module_1.ViewModule,
        ],
        providers: [
            {
                provide: core_1.APP_FILTER,
                useClass: exception_filter_1.GlobalExceptionFilter,
            },
        ],
    })
], AppModule);
