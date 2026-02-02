import { DatasetsService } from './datasets.service';
import type { UserEntity } from '../users/entities/user.entity';
import { UploadDatasetDto } from './dto/upload-dataset.dto';
import { CreateManualDatasetDto } from './dto/create-manual-dataset.dto';
export declare class DatasetsController {
    private readonly datasetsService;
    constructor(datasetsService: DatasetsService);
    private validateOrganization;
    findAll(user: Omit<UserEntity, 'passwordHash'>, page?: number, limit?: number): Promise<{
        data: import("./entities/dataset.entity").DatasetEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(user: Omit<UserEntity, 'passwordHash'>, id: string): Promise<import("./entities/dataset.entity").DatasetEntity>;
    create(user: Omit<UserEntity, 'passwordHash'>, dto: UploadDatasetDto): Promise<import("./entities/dataset.entity").DatasetEntity>;
    createManual(user: Omit<UserEntity, 'passwordHash'>, dto: CreateManualDatasetDto): Promise<import("./entities/dataset.entity").DatasetEntity>;
    update(user: Omit<UserEntity, 'passwordHash'>, id: string, dto: Partial<UploadDatasetDto>): Promise<import("./entities/dataset.entity").DatasetEntity>;
    uploadFile(user: Omit<UserEntity, 'passwordHash'>, id: string, file: Express.Multer.File): Promise<import("./entities/dataset.entity").DatasetEntity>;
    getPreview(user: Omit<UserEntity, 'passwordHash'>, id: string, limit?: number): Promise<{
        data: Record<string, unknown>[];
        columns: string[];
        total: number;
    }>;
    analyzeDataset(user: Omit<UserEntity, 'passwordHash'>, id: string): {
        datasetId: string;
        message: string;
    };
    getInsights(user: Omit<UserEntity, 'passwordHash'>, id: string): {
        datasetId: string;
        message: string;
    };
    generateReport(user: Omit<UserEntity, 'passwordHash'>, id: string, format?: 'json' | 'pdf'): Promise<{
        datasetId: string;
        message: string;
    }>;
    remove(user: Omit<UserEntity, 'passwordHash'>, id: string): Promise<void>;
}
