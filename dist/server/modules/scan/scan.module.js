"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanModule = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const scan_controller_1 = require("./scan.controller");
const scan_service_1 = require("./scan.service");
let ScanModule = class ScanModule {
};
exports.ScanModule = ScanModule;
exports.ScanModule = ScanModule = tslib_1.__decorate([
    (0, common_1.Module)({
        controllers: [scan_controller_1.ScanController],
        providers: [scan_service_1.ScanService],
    })
], ScanModule);
