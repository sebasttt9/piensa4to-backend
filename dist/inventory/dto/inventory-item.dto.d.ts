export declare class CreateInventoryItemDto {
    name: string;
    code: string;
    quantity: number;
    pvp: number;
    cost: number;
    datasetId?: string;
    dashboardId?: string;
}
export declare class UpdateInventoryItemDto {
    name?: string;
    code?: string;
    quantity?: number;
    pvp?: number;
    cost?: number;
    datasetId?: string;
    dashboardId?: string;
}
export declare class ApproveInventoryItemDto {
    status: 'approved' | 'rejected';
}
