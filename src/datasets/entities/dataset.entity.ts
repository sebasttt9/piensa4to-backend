import { DatasetAnalysis } from '../interfaces/dataset-analysis.interface';

export interface DatasetEntity {
    id: string;
    ownerId: string;
    name: string;
    description?: string;
    filename?: string;
    fileSize?: number;
    fileType?: 'csv' | 'xlsx';
    rowCount?: number;
    columnCount?: number;
    analysis?: DatasetAnalysis;
    preview: Record<string, unknown>[];
    status: 'pending' | 'processed' | 'error';
    tags: string[];
    createdAt: string;
    updatedAt: string;
}
