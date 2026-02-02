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
exports.ApproveInventoryItemDto = exports.UpdateInventoryItemDto = exports.CreateInventoryItemDto = void 0;
const class_validator_1 = require("class-validator");
class CreateInventoryItemDto {
    name;
    code;
    quantity;
    pvp;
    cost;
    datasetId;
    dashboardId;
}
exports.CreateInventoryItemDto = CreateInventoryItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "pvp", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateInventoryItemDto.prototype, "cost", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4', { message: 'El dataset debe ser un UUID válido' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "datasetId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4', { message: 'El dashboard debe ser un UUID válido' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInventoryItemDto.prototype, "dashboardId", void 0);
class UpdateInventoryItemDto {
    name;
    code;
    quantity;
    pvp;
    cost;
    datasetId;
    dashboardId;
}
exports.UpdateInventoryItemDto = UpdateInventoryItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateInventoryItemDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateInventoryItemDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateInventoryItemDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateInventoryItemDto.prototype, "pvp", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateInventoryItemDto.prototype, "cost", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4', { message: 'El dataset debe ser un UUID válido' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateInventoryItemDto.prototype, "datasetId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)('4', { message: 'El dashboard debe ser un UUID válido' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateInventoryItemDto.prototype, "dashboardId", void 0);
class ApproveInventoryItemDto {
    status;
}
exports.ApproveInventoryItemDto = ApproveInventoryItemDto;
__decorate([
    (0, class_validator_1.IsIn)(['approved', 'rejected']),
    __metadata("design:type", String)
], ApproveInventoryItemDto.prototype, "status", void 0);
//# sourceMappingURL=inventory-item.dto.js.map