import { ConfigService } from '@nestjs/config';
import { UploadDatasetDto } from './dto/upload-dataset.dto';
import { CreateManualDatasetDto } from './dto/create-manual-dataset.dto';
import { AnalysisService } from './analysis.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { DatasetEntity } from './entities/dataset.entity';
export declare class DatasetsService {
    private readonly supabase;
    private readonly analysisService;
    private readonly configService;
    private readonly maxRowsForPreview;
    private dataCache;
    private readonly tableName;
    constructor(supabase: SupabaseClient, analysisService: AnalysisService, configService: ConfigService);
    create(ownerId: string, dto: UploadDatasetDto, organizationId: string): Promise<DatasetEntity>;
    createManual(ownerId: string, dto: CreateManualDatasetDto, organizationId: string): Promise<DatasetEntity>;
    uploadDataset(ownerId: string, datasetId: string, file: Express.Multer.File, userRole: string | undefined, organizationId: string): Promise<DatasetEntity>;
    update(ownerId: string, datasetId: string, dto: Partial<UploadDatasetDto>, userRole: string | undefined, organizationId: string): Promise<DatasetEntity>;
    findAll(ownerId: string, userRole: string | undefined, skip: number | undefined, limit: number | undefined, organizationId: string): Promise<DatasetEntity[]>;
    countByUser(ownerId: string, userRole: string | undefined, organizationId: string): Promise<number>;
    findOne(ownerId: string, datasetId: string, userRole: string | undefined, organizationId: string): Promise<DatasetEntity>;
    getPreview(datasetId: string, limit?: number): Promise<Record<string, unknown>[]>;
    remove(ownerId: string, datasetId: string, userRole: string | undefined, organizationId: string): Promise<void>;
    private resolveExtension;
    private parseFile;
    private validateManualData;
    private validateColumnType;
    private toEntity;
}
