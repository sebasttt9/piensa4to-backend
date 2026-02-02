"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const configuration_1 = __importDefault(require("./config/configuration"));
const users_module_1 = require("./users/users.module");
const auth_module_1 = require("./auth/auth.module");
const datasets_module_1 = require("./datasets/datasets.module");
const dashboards_module_1 = require("./dashboards/dashboards.module");
const shared_module_1 = require("./common/shared.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const supabase_module_1 = require("./database/supabase.module");
const analytics_module_1 = require("./analytics/analytics.module");
const inventory_module_1 = require("./inventory/inventory.module");
const issues_module_1 = require("./issues/issues.module");
const organizations_module_1 = require("./organizations/organizations.module");
const commerce_module_1 = require("./commerce/commerce.module");
const superadmin_dashboard_module_1 = require("./superadmin-dashboard/superadmin-dashboard.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, load: [configuration_1.default], envFilePath: './.env' }),
            supabase_module_1.SupabaseModule,
            shared_module_1.SharedModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            datasets_module_1.DatasetsModule,
            dashboards_module_1.DashboardsModule,
            analytics_module_1.AnalyticsModule,
            inventory_module_1.InventoryModule,
            issues_module_1.IssuesModule,
            organizations_module_1.OrganizationsModule,
            commerce_module_1.CommerceModule,
            superadmin_dashboard_module_1.SuperadminDashboardModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map