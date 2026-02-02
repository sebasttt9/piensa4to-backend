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
exports.AiChatRequestDto = void 0;
const class_validator_1 = require("class-validator");
class AiChatRequestDto {
    message;
    datasetId;
}
exports.AiChatRequestDto = AiChatRequestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'El mensaje no puede estar vacío' }),
    (0, class_validator_1.MaxLength)(600, { message: 'El mensaje no puede superar los 600 caracteres' }),
    __metadata("design:type", String)
], AiChatRequestDto.prototype, "message", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsUUID)('4', { message: 'El dataset debe ser un UUID válido' }),
    __metadata("design:type", String)
], AiChatRequestDto.prototype, "datasetId", void 0);
//# sourceMappingURL=ai-chat-request.dto.js.map