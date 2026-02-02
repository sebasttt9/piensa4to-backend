import { SupabaseClient } from '@supabase/supabase-js';
import { RegisterSaleDto } from './dto/register-sale.dto';
export interface CommerceTotals {
    revenueCurrent: number;
    revenuePrevious: number;
    revenueChangePct: number;
    ordersCurrent: number;
    ordersPrevious: number;
    avgTicketCurrent: number;
    avgTicketPrevious: number;
    avgTicketChangePct: number;
    newCustomersCurrent: number;
    newCustomersPrevious: number;
    newCustomersChangePct: number;
    activeCustomers: number;
    returningCustomers: number;
}
export interface CommerceMonthlyPoint {
    month: string;
    label: string;
    revenue: number;
    orders: number;
    customers: number;
}
export interface CommerceSegmentPerformance {
    segment: string;
    customers: number;
    revenue: number;
    avgTicket: number;
    revenueShare: number;
}
export interface CommerceProductPerformance {
    sku: string;
    name: string;
    quantity: number;
    revenue: number;
    growthPct: number | null;
    revenueShare: number;
}
export interface CommerceOverview {
    totals: CommerceTotals;
    monthlyRevenue: CommerceMonthlyPoint[];
    segmentPerformance: CommerceSegmentPerformance[];
    topProducts: CommerceProductPerformance[];
    currency: string;
    hasOrders: boolean;
}
export declare class CommerceService {
    private readonly salesSupabase;
    private readonly accountsSupabase;
    private readonly salesOrdersTable;
    private readonly salesOrderItemsTable;
    private readonly customersTable;
    private readonly inventoryItemsTable;
    constructor(salesSupabase: SupabaseClient, accountsSupabase: SupabaseClient);
    getOverview(ownerId: string, organizationId?: string): Promise<CommerceOverview>;
    registerSale(ownerId: string, organizationId: string | undefined, dto: RegisterSaleDto): Promise<{
        orderId: `${string}-${string}-${string}-${string}-${string}`;
        orderTotal: number;
        currencyCode: string;
        quantity: number;
        remainingQuantity: number;
        registeredAt: string;
    }>;
    private fetchSalesOrders;
    private fetchSalesOrderItems;
    private fetchCustomers;
    private computeOrderAggregates;
    private computeMonthlySeries;
    private computeSegmentPerformance;
    private computeTopProducts;
    private buildTemporalContext;
    private extractMonthKey;
    private formatMonthLabel;
    private computeChangePct;
    private toNumber;
    private resolveItemRevenue;
    private isSchemaMismatchError;
    private shouldAttemptFallback;
}
