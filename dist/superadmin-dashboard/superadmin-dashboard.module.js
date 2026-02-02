"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperadminDashboardModule = void 0;
const common_1 = require("@nestjs/common");
const superadmin_dashboard_controller_1 = require("./superadmin-dashboard.controller");
const superadmin_dashboard_service_1 = require("./superadmin-dashboard.service");
const shared_module_1 = require("../common/shared.module");
let SuperadminDashboardModule = class SuperadminDashboardModule {
};
exports.SuperadminDashboardModule = SuperadminDashboardModule;
exports.SuperadminDashboardModule = SuperadminDashboardModule = __decorate([
    (0, common_1.Module)({
        imports: [shared_module_1.SharedModule],
        controllers: [superadmin_dashboard_controller_1.SuperadminDashboardController, superadmin_dashboard_controller_1.SuperadminDashboardAliasController],
        providers: [superadmin_dashboard_service_1.SuperadminDashboardService],
    })
], SuperadminDashboardModule);
//# sourceMappingURL=superadmin-dashboard.module.js.map