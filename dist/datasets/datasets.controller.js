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
exports.DatasetsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const datasets_service_1 = require("./datasets.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const upload_dataset_dto_1 = require("./dto/upload-dataset.dto");
const create_manual_dataset_dto_1 = require("./dto/create-manual-dataset.dto");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_enum_1 = require("../common/constants/roles.enum");
let DatasetsController = class DatasetsController {
    datasetsService;
    constructor(datasetsService) {
        this.datasetsService = datasetsService;
    }
    validateOrganization(organizationId) {
        return organizationId ?? 'default-org';
    }
    async findAll(user, page = 1, limit = 10) {
        const organizationId = this.validateOrganization(user.organizationId);
        const parsedPage = Number(page) || 1;
        const parsedLimit = Number(limit) || 10;
        const skip = (parsedPage - 1) * parsedLimit;
        const [datasets, total] = await Promise.all([
            this.datasetsService.findAll(user.id, user.role, skip, parsedLimit, organizationId),
            this.datasetsService.countByUser(user.id, user.role, organizationId),
        ]);
        return {
            data: datasets,
            total,
            page: parsedPage,
            limit: parsedLimit,
        };
    }
    findOne(user, id) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.datasetsService.findOne(user.id, id, user.role, organizationId);
    }
    create(user, dto) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.datasetsService.create(user.id, dto, organizationId);
    }
    createManual(user, dto) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.datasetsService.createManual(user.id, dto, organizationId);
    }
    update(user, id, dto) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.datasetsService.update(user.id, id, dto, user.role, organizationId);
    }
    uploadFile(user, id, file) {
        const organizationId = this.validateOrganization(user.organizationId);
        if (!file) {
            throw new common_1.BadRequestException('No file provided');
        }
        return this.datasetsService.uploadDataset(user.id, id, file, user.role, organizationId);
    }
    async getPreview(user, id, limit = 50) {
        const organizationId = this.validateOrganization(user.organizationId);
        const dataset = await this.datasetsService.findOne(user.id, id, user.role, organizationId);
        const preview = await this.datasetsService.getPreview(id, Number(limit));
        const columns = preview.length > 0 ? Object.keys(preview[0]) : [];
        return {
            data: preview,
            columns,
            total: dataset.rowCount || 0,
        };
    }
    analyzeDataset(user, id) {
        const organizationId = this.validateOrganization(user.organizationId);
        return { datasetId: id, message: 'Analysis coming soon' };
    }
    getInsights(user, id) {
        const organizationId = this.validateOrganization(user.organizationId);
        return { datasetId: id, message: 'Insights coming soon' };
    }
    async generateReport(user, id, format = 'json') {
        const organizationId = this.validateOrganization(user.organizationId);
        await this.datasetsService.findOne(user.id, id, user.role, organizationId);
        if (format === 'json') {
            return { datasetId: id, message: 'JSON report coming soon' };
        }
        throw new common_1.BadRequestException('PDF export coming soon');
    }
    remove(user, id) {
        const organizationId = this.validateOrganization(user.organizationId);
        return this.datasetsService.remove(user.id, id, user.role, organizationId);
    }
};
exports.DatasetsController = DatasetsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], DatasetsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.Admin, roles_enum_1.UserRole.User),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upload_dataset_dto_1.UploadDatasetDto]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('manual'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.Admin, roles_enum_1.UserRole.User),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_manual_dataset_dto_1.CreateManualDatasetDto]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "createManual", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/upload'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.Admin, roles_enum_1.UserRole.User),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Get)(':id/preview'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], DatasetsController.prototype, "getPreview", null);
__decorate([
    (0, common_1.Get)(':id/analyze'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "analyzeDataset", null);
__decorate([
    (0, common_1.Get)(':id/insights'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "getInsights", null);
__decorate([
    (0, common_1.Get)(':id/report'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], DatasetsController.prototype, "generateReport", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "remove", null);
exports.DatasetsController = DatasetsController = __decorate([
    (0, common_1.Controller)('datasets'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [datasets_service_1.DatasetsService])
], DatasetsController);
//# sourceMappingURL=datasets.controller.js.map