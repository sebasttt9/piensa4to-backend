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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardsController = void 0;
const common_1 = require("@nestjs/common");
const dashboards_service_1 = require("./dashboards.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_dashboard_dto_1 = require("./dto/create-dashboard.dto");
const update_dashboard_dto_1 = require("./dto/update-dashboard.dto");
const share_dashboard_dto_1 = require("./dto/share-dashboard.dto");
const approve_dashboard_dto_1 = require("./dto/approve-dashboard.dto");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_enum_1 = require("../common/constants/roles.enum");
let DashboardsController = class DashboardsController {
    dashboardsService;
    constructor(dashboardsService) {
        this.dashboardsService = dashboardsService;
    }
    validateOrganization(organizationId) {
        return organizationId ?? 'default-org';
    }
    create(user, dto) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.dashboardsService.create(user.id, dto, user.role, organizationId);
    }
    async findAll(user, page = 1, limit = 10) {
        const organizationId = this.validateOrganization(user.organizationId);
        const parsedPage = Number(page) || 1;
        const parsedLimit = Number(limit) || 10;
        const skip = (parsedPage - 1) * parsedLimit;
        const [dashboards, total] = await Promise.all([
            this.dashboardsService.findAll(user.id, user.role, skip, parsedLimit, organizationId),
            this.dashboardsService.countByUser(user.id, user.role, organizationId),
        ]);
        return {
            data: dashboards,
            total,
            page: parsedPage,
            limit: parsedLimit,
        };
    }
    findOne(user, id) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.dashboardsService.findOne(user.id, id, user.role, organizationId);
    }
    update(user, id, dto) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.dashboardsService.update(user.id, id, dto, user.role, organizationId);
    }
    share(user, id, dto) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.dashboardsService.share(user.id, id, dto.isPublic, user.role, organizationId);
    }
    shareWithContact(user, id, dto) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.dashboardsService.shareWithContact(user.id, id, dto, user.role, organizationId);
    }
    remove(user, id) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.dashboardsService.remove(user.id, id, user.role, organizationId);
    }
    async export(user, id, format = 'json', res) {
        const organizationId = this.validateOrganization(user.organizationId);
        const normalizedFormat = format === 'pdf' ? 'pdf' : 'json';
        if (normalizedFormat === 'json') {
            const dashboard = await this.dashboardsService.export(user.id, id, 'json', user.role, organizationId);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="dashboard-${id}.json"`);
            return res.send(JSON.stringify(dashboard, null, 2));
        }
        const pdfBuffer = await this.dashboardsService.export(user.id, id, 'pdf', user.role, organizationId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="dashboard-${id}.pdf"`);
        return res.send(pdfBuffer);
    }
    approve(user, id, dto) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.dashboardsService.approveDashboard(user.id, id, dto.status, user.role, organizationId);
    }
};
exports.DashboardsController = DashboardsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_dashboard_dto_1.CreateDashboardDto]),
    __metadata("design:returntype", void 0)
], DashboardsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DashboardsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_dashboard_dto_1.UpdateDashboardDto]),
    __metadata("design:returntype", void 0)
], DashboardsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/share'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DashboardsController.prototype, "share", null);
__decorate([
    (0, common_1.Post)(':id/share/invite'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, share_dashboard_dto_1.ShareDashboardDto]),
    __metadata("design:returntype", void 0)
], DashboardsController.prototype, "shareWithContact", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DashboardsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/export'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], DashboardsController.prototype, "export", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, approve_dashboard_dto_1.ApproveDashboardDto]),
    __metadata("design:returntype", void 0)
], DashboardsController.prototype, "approve", null);
exports.DashboardsController = DashboardsController = __decorate([
    (0, common_1.Controller)('dashboards'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [dashboards_service_1.DashboardsService])
], DashboardsController);
//# sourceMappingURL=dashboards.controller.js.map