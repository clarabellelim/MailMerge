"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SendLogModule = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const send_log_controller_1 = require("./send-log.controller");
const send_log_service_1 = require("./send-log.service");
const axios_1 = require("@nestjs/axios");
const auth_module_1 = require("../auth/auth.module");
let SendLogModule = class SendLogModule {
};
exports.SendLogModule = SendLogModule;
exports.SendLogModule = SendLogModule = tslib_1.__decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule, auth_module_1.AuthModule],
        controllers: [send_log_controller_1.SendLogController],
        providers: [send_log_service_1.SendLogService],
    })
], SendLogModule);
