"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetsModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const config_1 = require("@nestjs/config");
const multer_1 = require("multer");
const datasets_controller_1 = require("./datasets.controller");
const datasets_service_1 = require("./datasets.service");
const analysis_service_1 = require("./analysis.service");
const supabase_module_1 = require("../database/supabase.module");
let DatasetsModule = class DatasetsModule {
};
exports.DatasetsModule = DatasetsModule;
exports.DatasetsModule = DatasetsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            supabase_module_1.SupabaseModule,
            platform_express_1.MulterModule.registerAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    storage: (0, multer_1.memoryStorage)(),
                    limits: {
                        fileSize: configService.get('uploads.maxFileSize', 5 * 1024 * 1024),
                    },
                }),
            }),
        ],
        controllers: [datasets_controller_1.DatasetsController],
        providers: [datasets_service_1.DatasetsService, analysis_service_1.AnalysisService],
        exports: [datasets_service_1.DatasetsService],
    })
], DatasetsModule);
//# sourceMappingURL=datasets.module.js.map