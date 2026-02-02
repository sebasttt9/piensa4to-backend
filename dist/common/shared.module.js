"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedModule = void 0;
const common_1 = require("@nestjs/common");
const storage_service_1 = require("./services/storage.service");
const email_service_1 = require("./services/email.service");
const cache_service_1 = require("./services/cache.service");
const openai_service_1 = require("./services/openai.service");
const active_users_service_1 = require("./services/active-users.service");
let SharedModule = class SharedModule {
};
exports.SharedModule = SharedModule;
exports.SharedModule = SharedModule = __decorate([
    (0, common_1.Module)({
        providers: [storage_service_1.StorageService, email_service_1.EmailService, cache_service_1.CacheService, openai_service_1.OpenAiService, active_users_service_1.ActiveUsersService],
        exports: [storage_service_1.StorageService, email_service_1.EmailService, cache_service_1.CacheService, openai_service_1.OpenAiService, active_users_service_1.ActiveUsersService],
    })
], SharedModule);
//# sourceMappingURL=shared.module.js.map