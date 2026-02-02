export declare class ManualColumnDto {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    description?: string;
}
export declare class CreateManualDatasetDto {
    name: string;
    description?: string;
    tags?: string[];
    columns: ManualColumnDto[];
    data: Record<string, any>[];
}
