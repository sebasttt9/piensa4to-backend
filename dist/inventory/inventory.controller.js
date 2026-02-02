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
exports.InventoryController = void 0;
const common_1 = require("@nestjs/common");
const inventory_service_1 = require("./inventory.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const adjust_inventory_dto_1 = require("./dto/adjust-inventory.dto");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_enum_1 = require("../common/constants/roles.enum");
const inventory_item_dto_1 = require("./dto/inventory-item.dto");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_constants_1 = require("../database/supabase.constants");
const common_2 = require("@nestjs/common");
let InventoryController = class InventoryController {
    inventoryService;
    supabase;
    constructor(inventoryService, supabase) {
        this.inventoryService = inventoryService;
        this.supabase = supabase;
    }
    async testEndpoint() {
        const testItems = [
            {
                owner_id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Producto de Prueba 1',
                code: 'TEST001',
                quantity: 100,
                pvp: 25.50,
                cost: 15.00,
                status: 'pending'
            },
            {
                owner_id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Producto de Prueba 2',
                code: 'TEST002',
                quantity: 50,
                pvp: 45.00,
                cost: 30.00,
                status: 'pending'
            },
            {
                owner_id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'Producto de Prueba 3',
                code: 'TEST003',
                quantity: 75,
                pvp: 12.99,
                cost: 8.50,
                status: 'pending'
            }
        ];
        try {
            const { data, error } = await this.supabase
                .from('inventory_items')
                .upsert(testItems, { onConflict: 'code' });
            if (error) {
                console.error('Error creating test items:', error);
                return { error: error.message };
            }
            return { message: 'Test items created', count: testItems.length, data };
        }
        catch (err) {
            console.error('Exception creating test items:', err);
            return { error: 'Exception occurred' };
        }
    }
    async testApproveItem(itemId, dto) {
        try {
            const { data: existing, error: fetchError } = await this.supabase
                .from('inventory_items')
                .select('id')
                .eq('id', itemId)
                .single();
            if (fetchError || !existing) {
                return { error: 'Item not found', fetchError: fetchError?.message };
            }
            const { data, error } = await this.supabase
                .from('inventory_items')
                .update({
                status: dto.status
            })
                .eq('id', itemId)
                .select()
                .single();
            if (error) {
                return { error: error.message, details: error };
            }
            return data;
        }
        catch (err) {
            return { error: 'Exception occurred', exception: err.message };
        }
    }
    async debugEndpoint(user) {
        return {
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            timestamp: new Date().toISOString()
        };
    }
    getSummary(user) {
        return this.inventoryService.getInventory(user.id, user.role, user.organizationId);
    }
    adjustInventory(user, datasetId, body) {
        return this.inventoryService.adjustInventory(user.id, datasetId, body.amount, user.role, user.organizationId);
    }
    resetAdjustments(user) {
        return this.inventoryService.resetAdjustments(user.id, user.role, user.organizationId);
    }
    createItem(user, dto) {
        return this.inventoryService.createItem(user.id, dto, user.role, user.organizationId);
    }
    getItems(user) {
        console.log('GET /inventory/items called by user:', user.id, 'role:', user.role, 'email:', user.email, 'organizationId:', user.organizationId);
        return this.inventoryService.getItems(user.id, user.role, user.organizationId);
    }
    getItem(user, itemId) {
        return this.inventoryService.getItem(user.id, itemId, user.role, user.organizationId);
    }
    updateItem(user, itemId, dto) {
        return this.inventoryService.updateItem(user.id, itemId, dto, user.role, user.organizationId);
    }
    approveItem(user, itemId, dto) {
        return this.inventoryService.approveItem(user.id, itemId, dto.status, user.role, user.organizationId);
    }
    deleteItem(user, itemId) {
        return this.inventoryService.deleteItem(user.id, itemId, user.role, user.organizationId);
    }
};
exports.InventoryController = InventoryController;
__decorate([
    (0, common_1.Get)('test'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "testEndpoint", null);
__decorate([
    (0, common_1.Patch)('test/approve/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "testApproveItem", null);
__decorate([
    (0, common_1.Get)('debug'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InventoryController.prototype, "debugEndpoint", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Post)(':datasetId/adjust'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('datasetId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, adjust_inventory_dto_1.AdjustInventoryDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "adjustInventory", null);
__decorate([
    (0, common_1.Delete)('adjustments'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "resetAdjustments", null);
__decorate([
    (0, common_1.Post)('items'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, inventory_item_dto_1.CreateInventoryItemDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "createItem", null);
__decorate([
    (0, common_1.Get)('items'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getItems", null);
__decorate([
    (0, common_1.Get)('items/:id'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "getItem", null);
__decorate([
    (0, common_1.Put)('items/:id'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, inventory_item_dto_1.UpdateInventoryItemDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Patch)('items/:id/approve'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, inventory_item_dto_1.ApproveInventoryItemDto]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "approveItem", null);
__decorate([
    (0, common_1.Delete)('items/:id'),
    (0, roles_decorator_1.Roles)(roles_enum_1.UserRole.User, roles_enum_1.UserRole.Admin),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InventoryController.prototype, "deleteItem", null);
exports.InventoryController = InventoryController = __decorate([
    (0, common_1.Controller)('inventory'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __param(1, (0, common_2.Inject)(supabase_constants_1.SUPABASE_DATA_CLIENT)),
    __metadata("design:paramtypes", [inventory_service_1.InventoryService,
        supabase_js_1.SupabaseClient])
], InventoryController);
//# sourceMappingURL=inventory.controller.js.map