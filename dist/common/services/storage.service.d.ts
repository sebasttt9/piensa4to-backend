import { ConfigService } from '@nestjs/config';
export interface StorageProvider {
    upload(key: string, data: Buffer, mimeType: string): Promise<string>;
    delete(key: string): Promise<void>;
    getUrl(key: string): string;
}
export declare class StorageService {
    private configService;
    private provider;
    constructor(configService: ConfigService);
    uploadFile(key: string, data: Buffer, mimeType?: string): Promise<string>;
    deleteFile(key: string): Promise<void>;
    getFileUrl(key: string): string;
    getFileData(key: string): Buffer | undefined;
}
