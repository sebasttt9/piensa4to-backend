import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StorageProvider {
    upload(key: string, data: Buffer, mimeType: string): Promise<string>;
    delete(key: string): Promise<void>;
    getUrl(key: string): string;
}

/**
 * In-memory storage provider for development
 */
class MemoryStorageProvider implements StorageProvider {
    private storage = new Map<string, Buffer>();

    async upload(key: string, data: Buffer): Promise<string> {
        this.storage.set(key, data);
        return `memory://${key}`;
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key);
    }

    getUrl(key: string): string {
        return `memory://${key}`;
    }

    getData(key: string): Buffer | undefined {
        return this.storage.get(key);
    }
}

/**
 * AWS S3 storage provider for production
 */
class S3StorageProvider implements StorageProvider {
    constructor(private s3Client: any, private bucket: string) { }

    async upload(key: string, data: Buffer, mimeType: string): Promise<string> {
        await this.s3Client.putObject({
            Bucket: this.bucket,
            Key: key,
            Body: data,
            ContentType: mimeType,
        });
        return `s3://${this.bucket}/${key}`;
    }

    async delete(key: string): Promise<void> {
        await this.s3Client.deleteObject({
            Bucket: this.bucket,
            Key: key,
        });
    }

    getUrl(key: string): string {
        return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }
}

@Injectable()
export class StorageService {
    private provider: StorageProvider;

    constructor(private configService: ConfigService) {
        const storageType = configService.get('uploads.storageType', 'memory');

        if (storageType === 's3') {
            // Initialize S3 provider (requires AWS SDK setup)
            // This is a placeholder - implement actual S3 client initialization
            this.provider = new MemoryStorageProvider(); // Fallback
        } else {
            this.provider = new MemoryStorageProvider();
        }
    }

    async uploadFile(
        key: string,
        data: Buffer,
        mimeType: string = 'application/octet-stream',
    ): Promise<string> {
        return this.provider.upload(key, data, mimeType);
    }

    async deleteFile(key: string): Promise<void> {
        return this.provider.delete(key);
    }

    getFileUrl(key: string): string {
        return this.provider.getUrl(key);
    }

    // Helper method for memory storage
    getFileData(key: string): Buffer | undefined {
        if (this.provider instanceof MemoryStorageProvider) {
            return this.provider.getData(key);
        }
        return undefined;
    }
}
