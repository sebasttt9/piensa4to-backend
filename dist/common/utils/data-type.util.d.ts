export type DetectedColumnType = 'number' | 'date' | 'string';
export declare const detectColumnType: (values: unknown[]) => DetectedColumnType;
