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
exports.CommerceController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_enum_1 = require("../common/constants/roles.enum");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const commerce_service_1 = require("./commerce.service");
const register_sale_dto_1 = require("./dto/register-sale.dto");
let CommerceController = class CommerceController {
    commerceService;
    constructor(commerceService) {
        this.commerceService = commerceService;
    }
    getOverview(user) {
        return this.commerceService.getOverview(user.id, user.organizationId);
    }
    registerSale(user, dto) {
        return this.commerceService.registerSale(user.id, user.organizationId, dto);
    }
};
exports.CommerceController = CommerceController;
__decorate([
    (0, common_1.Get)('overview'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CommerceController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Post)('sales'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_sale_dto_1.RegisterSaleDto]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "registerSale", null);
exports.CommerceController = CommerceController = __decorate([
    (0, common_1.Controller)('commerce'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [commerce_service_1.CommerceService])
], CommerceController);
//# sourceMappingURL=commerce.controller.js.map