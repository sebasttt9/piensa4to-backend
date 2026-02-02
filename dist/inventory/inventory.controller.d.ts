import { InventoryService } from './inventory.service';
import type { UserEntity } from '../users/entities/user.entity';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { UserRole } from '../common/constants/roles.enum';
import { CreateInventoryItemDto, UpdateInventoryItemDto, ApproveInventoryItemDto } from './dto/inventory-item.dto';
import { SupabaseClient } from '@supabase/supabase-js';
export declare class InventoryController {
    private readonly inventoryService;
    private readonly supabase;
    constructor(inventoryService: InventoryService, supabase: SupabaseClient);
    testEndpoint(): Promise<{
        error: string;
        message?: undefined;
        count?: undefined;
        data?: undefined;
    } | {
        message: string;
        count: number;
        data: null;
        error?: undefined;
    }>;
    testApproveItem(itemId: string, dto: {
        status: string;
    }): Promise<any>;
    debugEndpoint(user: Omit<UserEntity, 'passwordHash'>): Promise<{
        user: {
            id: string;
            email: string;
            role: UserRole;
        };
        timestamp: string;
    }>;
    getSummary(user: Omit<UserEntity, 'passwordHash'>): Promise<import("./inventory.service").InventorySummary>;
    adjustInventory(user: Omit<UserEntity, 'passwordHash'>, datasetId: string, body: AdjustInventoryDto): Promise<import("./inventory.service").InventorySummary>;
    resetAdjustments(user: Omit<UserEntity, 'passwordHash'>): Promise<import("./inventory.service").InventorySummary>;
    createItem(user: Omit<UserEntity, 'passwordHash'>, dto: CreateInventoryItemDto): Promise<import("./inventory.service").InventoryItem>;
    getItems(user: Omit<UserEntity, 'passwordHash'>): Promise<import("./inventory.service").InventoryItem[]>;
    getItem(user: Omit<UserEntity, 'passwordHash'>, itemId: string): Promise<import("./inventory.service").InventoryItem>;
    updateItem(user: Omit<UserEntity, 'passwordHash'>, itemId: string, dto: UpdateInventoryItemDto): Promise<import("./inventory.service").InventoryItem>;
    approveItem(user: Omit<UserEntity, 'passwordHash'>, itemId: string, dto: ApproveInventoryItemDto): Promise<import("./inventory.service").InventoryItem>;
    deleteItem(user: Omit<UserEntity, 'passwordHash'>, itemId: string): Promise<void>;
}
