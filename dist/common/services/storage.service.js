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
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
class MemoryStorageProvider {
    storage = new Map();
    async upload(key, data) {
        this.storage.set(key, data);
        return `memory://${key}`;
    }
    async delete(key) {
        this.storage.delete(key);
    }
    getUrl(key) {
        return `memory://${key}`;
    }
    getData(key) {
        return this.storage.get(key);
    }
}
class S3StorageProvider {
    s3Client;
    bucket;
    constructor(s3Client, bucket) {
        this.s3Client = s3Client;
        this.bucket = bucket;
    }
    async upload(key, data, mimeType) {
        await this.s3Client.putObject({
            Bucket: this.bucket,
            Key: key,
            Body: data,
            ContentType: mimeType,
        });
        return `s3://${this.bucket}/${key}`;
    }
    async delete(key) {
        await this.s3Client.deleteObject({
            Bucket: this.bucket,
            Key: key,
        });
    }
    getUrl(key) {
        return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }
}
let StorageService = class StorageService {
    configService;
    provider;
    constructor(configService) {
        this.configService = configService;
        const storageType = configService.get('uploads.storageType', 'memory');
        if (storageType === 's3') {
            this.provider = new MemoryStorageProvider();
        }
        else {
            this.provider = new MemoryStorageProvider();
        }
    }
    async uploadFile(key, data, mimeType = 'application/octet-stream') {
        return this.provider.upload(key, data, mimeType);
    }
    async deleteFile(key) {
        return this.provider.delete(key);
    }
    getFileUrl(key) {
        return this.provider.getUrl(key);
    }
    getFileData(key) {
        if (this.provider instanceof MemoryStorageProvider) {
            return this.provider.getData(key);
        }
        return undefined;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map