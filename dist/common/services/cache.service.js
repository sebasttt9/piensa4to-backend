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
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let CacheService = class CacheService {
    configService;
    logger = new common_1.Logger('CacheService');
    redisClient = null;
    memoryCache = new Map();
    useRedis = false;
    constructor(configService) {
        this.configService = configService;
        this.initialize();
    }
    initialize() {
        const redisEnabled = this.configService.get('redis.enabled', false);
        if (redisEnabled) {
            this.logger.warn('Redis cache enabled but client not initialized. Using in-memory cache.');
            this.useRedis = false;
        }
        else {
            this.logger.log('Using in-memory cache. For production, enable Redis.');
        }
    }
    async set(key, value, ttl = 3600) {
        if (this.useRedis && this.redisClient) {
            await this.redisClient.setex(key, ttl, JSON.stringify(value));
        }
        else {
            const expiredAt = Date.now() + ttl * 1000;
            this.memoryCache.set(key, { value, expiredAt });
        }
    }
    async get(key) {
        if (this.useRedis && this.redisClient) {
            const data = await this.redisClient.get(key);
            return data ? JSON.parse(data) : null;
        }
        else {
            const cached = this.memoryCache.get(key);
            if (!cached)
                return null;
            if (Date.now() > cached.expiredAt) {
                this.memoryCache.delete(key);
                return null;
            }
            return cached.value;
        }
    }
    async delete(key) {
        if (this.useRedis && this.redisClient) {
            await this.redisClient.del(key);
        }
        else {
            this.memoryCache.delete(key);
        }
    }
    async clear() {
        if (this.useRedis && this.redisClient) {
            await this.redisClient.flushdb();
        }
        else {
            this.memoryCache.clear();
        }
    }
    async getOrSet(key, loader, ttl = 3600) {
        const cached = await this.get(key);
        if (cached) {
            return cached;
        }
        const value = await loader();
        await this.set(key, value, ttl);
        return value;
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CacheService);
//# sourceMappingURL=cache.service.js.map