"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperadminDashboardAliasController = exports.SuperadminDashboardController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_enum_1 = require("../common/constants/roles.enum");
const superadmin_dashboard_service_1 = require("./superadmin-dashboard.service");
let SuperadminDashboardController = class SuperadminDashboardController {
    dashboardService;
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    getOverview() {
        return this.dashboardService.getOverview();
    }
};
exports.SuperadminDashboardController = SuperadminDashboardController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.SuperAdmin),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuperadminDashboardController.prototype, "getOverview", null);
exports.SuperadminDashboardController = SuperadminDashboardController = __decorate([
    (0, common_1.Controller)('superadmin/dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [superadmin_dashboard_service_1.SuperadminDashboardService])
], SuperadminDashboardController);
let SuperadminDashboardAliasController = class SuperadminDashboardAliasController {
    dashboardService;
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    getOverview() {
        return this.dashboardService.getOverview();
    }
};
exports.SuperadminDashboardAliasController = SuperadminDashboardAliasController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.SuperAdmin),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SuperadminDashboardAliasController.prototype, "getOverview", null);
exports.SuperadminDashboardAliasController = SuperadminDashboardAliasController = __decorate([
    (0, common_1.Controller)('superadmin-dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [superadmin_dashboard_service_1.SuperadminDashboardService])
], SuperadminDashboardAliasController);
//# sourceMappingURL=superadmin-dashboard.controller.js.map