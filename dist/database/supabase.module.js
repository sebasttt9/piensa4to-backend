"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_constants_1 = require("./supabase.constants");
const warnIfProjectIdMismatch = (url, expectedId, label) => {
    const host = new URL(url).hostname;
    if (!host.startsWith(`${expectedId}.`)) {
        console.warn(`[Supabase] ${label}: la URL ${host} no coincide con projectId esperado ${expectedId}. Revisa tus variables de entorno.`);
    }
};
let SupabaseModule = class SupabaseModule {
};
exports.SupabaseModule = SupabaseModule;
exports.SupabaseModule = SupabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            {
                provide: supabase_constants_1.SUPABASE_CLIENT,
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const url = configService.get('supabase.url');
                    const serviceRoleKey = configService.get('supabase.serviceRoleKey');
                    const projectId = configService.get('supabase.projectId');
                    if (!url || !serviceRoleKey) {
                        throw new Error('Primary Supabase credentials are not configured');
                    }
                    if (projectId) {
                        warnIfProjectIdMismatch(url, projectId, 'Base de usuarios');
                    }
                    return (0, supabase_js_1.createClient)(url, serviceRoleKey, {
                        auth: {
                            persistSession: false,
                        },
                    });
                },
            },
            {
                provide: supabase_constants_1.SUPABASE_DATA_CLIENT,
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const dataUrl = configService.get('supabase.datasets.url');
                    const dataServiceRoleKey = configService.get('supabase.datasets.serviceRoleKey');
                    const dataProjectId = configService.get('supabase.datasets.projectId');
                    if (!dataUrl || !dataServiceRoleKey) {
                        throw new Error('Datasets Supabase credentials are not configured');
                    }
                    if (dataProjectId) {
                        warnIfProjectIdMismatch(dataUrl, dataProjectId, 'Base de datos');
                    }
                    return (0, supabase_js_1.createClient)(dataUrl, dataServiceRoleKey, {
                        auth: {
                            persistSession: false,
                        },
                    });
                },
            },
        ],
        exports: [supabase_constants_1.SUPABASE_CLIENT, supabase_constants_1.SUPABASE_DATA_CLIENT],
    })
], SupabaseModule);
//# sourceMappingURL=supabase.module.js.map