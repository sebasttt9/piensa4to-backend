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
exports.UpdateIssueDto = exports.IssueStatus = exports.IssueType = void 0;
const class_validator_1 = require("class-validator");
var IssueType;
(function (IssueType) {
    IssueType["COMPRA"] = "compra";
    IssueType["DEVOLUCION"] = "devolucion";
    IssueType["ERROR_LOGISTICO"] = "error_logistico";
    IssueType["OTRO"] = "otro";
})(IssueType || (exports.IssueType = IssueType = {}));
var IssueStatus;
(function (IssueStatus) {
    IssueStatus["PENDIENTE"] = "pendiente";
    IssueStatus["RESUELTO"] = "resuelto";
    IssueStatus["CANCELADO"] = "cancelado";
})(IssueStatus || (exports.IssueStatus = IssueStatus = {}));
class UpdateIssueDto {
    type;
    description;
    amount;
    status;
}
exports.UpdateIssueDto = UpdateIssueDto;
__decorate([
    (0, class_validator_1.IsEnum)(IssueType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateIssueDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateIssueDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateIssueDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(IssueStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateIssueDto.prototype, "status", void 0);
//# sourceMappingURL=update-issue.dto.js.map