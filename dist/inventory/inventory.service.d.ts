import { SupabaseClient } from '@supabase/supabase-js';
import { AnalyticsService, OverviewAnalytics } from '../analytics/analytics.service';
import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/inventory-item.dto';
import { UserRole } from '../common/constants/roles.enum';
export interface InventoryItem {
    id: string;
    ownerId: string;
    datasetId: string | null;
    dashboardId: string | null;
    name: string;
    code: string;
    quantity: number;
    pvp: number;
    cost: number;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy: string | null;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface InventoryDashboardSummary {
    id: string;
    name: string;
    updatedAt: string;
}
export interface InventoryDatasetSummary {
    id: string;
    name: string;
    status: 'pending' | 'processed' | 'error';
    rowCount: number;
    updatedAt: string;
    tags: string[];
}
export interface InventoryRecord {
    dataset: InventoryDatasetSummary;
    dashboards: InventoryDashboardSummary[];
    adjustment: number;
    total: number;
}
export interface InventorySummary {
    overview: OverviewAnalytics | null;
    totals: {
        baseUnits: number;
        adjustedUnits: number;
        datasetsWithAlerts: number;
        dashboardsLinked: number;
    };
    records: InventoryRecord[];
}
export declare class InventoryService {
    private readonly supabase;
    private readonly analyticsService;
    private readonly inventoryTable;
    private readonly itemsTable;
    private readonly datasetsTable;
    private readonly dashboardsTable;
    constructor(supabase: SupabaseClient, analyticsService: AnalyticsService);
    getInventory(ownerId: string, userRole?: UserRole, organizationId?: string): Promise<InventorySummary>;
    adjustInventory(ownerId: string, datasetId: string, amount: number, userRole?: UserRole, organizationId?: string): Promise<InventorySummary>;
    resetAdjustments(ownerId: string, userRole?: UserRole, organizationId?: string): Promise<InventorySummary>;
    private fetchDatasets;
    private fetchDashboards;
    private fetchAdjustments;
    private fetchAdjustment;
    private ensureDatasetOwnership;
    private ensureDashboardOwnership;
    private buildRecords;
    private buildTotals;
    createItem(ownerId: string, dto: CreateInventoryItemDto, userRole?: UserRole, organizationId?: string): Promise<InventoryItem>;
    getItems(ownerId: string, userRole?: UserRole, organizationId?: string): Promise<InventoryItem[]>;
    getItem(ownerId: string, itemId: string, userRole?: UserRole, organizationId?: string): Promise<InventoryItem>;
    updateItem(ownerId: string, itemId: string, dto: UpdateInventoryItemDto, userRole?: UserRole, organizationId?: string): Promise<InventoryItem>;
    approveItem(ownerId: string, itemId: string, status: 'approved' | 'rejected', userRole?: UserRole, organizationId?: string): Promise<InventoryItem>;
    deleteItem(ownerId: string, itemId: string, userRole?: UserRole, organizationId?: string): Promise<void>;
    private mapToInventoryItem;
    private safeGetOverview;
}
