"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfluencerModule = void 0;
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const influencer_controller_1 = require("./influencer.controller");
const influencer_service_1 = require("./influencer.service");
let InfluencerModule = class InfluencerModule {
};
exports.InfluencerModule = InfluencerModule;
exports.InfluencerModule = InfluencerModule = tslib_1.__decorate([
    (0, common_1.Module)({
        controllers: [influencer_controller_1.InfluencerController],
        providers: [influencer_service_1.InfluencerService],
        exports: [influencer_service_1.InfluencerService],
    })
], InfluencerModule);
