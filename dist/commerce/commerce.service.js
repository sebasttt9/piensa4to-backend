"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommerceService = void 0;
const order_status_constant_1 = require("./order-status.constant");
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_constants_1 = require("../database/supabase.constants");
let CommerceService = class CommerceService {
    salesSupabase;
    accountsSupabase;
    salesOrdersTable = 'sales_orders';
    salesOrderItemsTable = 'sales_order_items';
    customersTable = 'customers';
    inventoryItemsTable = 'inventory_items';
    constructor(salesSupabase, accountsSupabase) {
        this.salesSupabase = salesSupabase;
        this.accountsSupabase = accountsSupabase;
    }
    async getOverview(ownerId, organizationId) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para consultar el desempeño comercial.');
        }
        const { now, currentMonthKey, previousMonthKey, sixMonthsAgo } = this.buildTemporalContext();
        const [orders, items, customers] = await Promise.all([
            this.fetchSalesOrders(ownerId, organizationId, sixMonthsAgo),
            this.fetchSalesOrderItems(ownerId, organizationId, sixMonthsAgo),
            this.fetchCustomers(ownerId, organizationId),
        ]);
        const currency = orders.find((order) => order.currency_code)?.currency_code ?? 'USD';
        const orderTotals = this.computeOrderAggregates(orders, customers, currentMonthKey, previousMonthKey);
        const monthlyRevenue = this.computeMonthlySeries(orders, customers, sixMonthsAgo, now);
        const segmentPerformance = this.computeSegmentPerformance(orders, customers);
        const topProducts = this.computeTopProducts(orders, items, currentMonthKey, previousMonthKey);
        return {
            totals: {
                revenueCurrent: orderTotals.revenueCurrent,
                revenuePrevious: orderTotals.revenuePrevious,
                revenueChangePct: this.computeChangePct(orderTotals.revenuePrevious, orderTotals.revenueCurrent),
                ordersCurrent: orderTotals.ordersCurrent,
                ordersPrevious: orderTotals.ordersPrevious,
                avgTicketCurrent: orderTotals.avgTicketCurrent,
                avgTicketPrevious: orderTotals.avgTicketPrevious,
                avgTicketChangePct: this.computeChangePct(orderTotals.avgTicketPrevious, orderTotals.avgTicketCurrent),
                newCustomersCurrent: orderTotals.newCustomersCurrent,
                newCustomersPrevious: orderTotals.newCustomersPrevious,
                newCustomersChangePct: this.computeChangePct(orderTotals.newCustomersPrevious, orderTotals.newCustomersCurrent),
                activeCustomers: orderTotals.activeCustomers,
                returningCustomers: orderTotals.returningCustomers,
            },
            monthlyRevenue,
            segmentPerformance,
            topProducts,
            currency,
            hasOrders: orders.length > 0,
        };
    }
    async registerSale(ownerId, organizationId, dto) {
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para registrar ventas.');
        }
        const sanitizedQuantity = Number.isFinite(dto.quantity) ? Math.floor(dto.quantity) : 0;
        if (sanitizedQuantity <= 0) {
            throw new common_1.BadRequestException('La cantidad debe ser mayor a cero.');
        }
        const { data: inventoryItem, error: inventoryError } = await this.salesSupabase
            .from(this.inventoryItemsTable)
            .select('id, owner_id, organization_id, name, code, quantity, status')
            .eq('id', dto.itemId)
            .single();
        if (inventoryError || !inventoryItem) {
            if (this.isSchemaMismatchError(inventoryError)) {
                console.error('[Commerce] registerSale inventory schema mismatch', inventoryError);
                throw new common_1.InternalServerErrorException('No se pudo registrar la venta.');
            }
            throw new common_1.BadRequestException('El producto indicado no existe.');
        }
        if (inventoryItem.owner_id !== ownerId) {
            throw new common_1.BadRequestException('El producto indicado no pertenece al usuario.');
        }
        if (inventoryItem.organization_id !== organizationId) {
            throw new common_1.BadRequestException('El producto indicado no pertenece a la organización.');
        }
        if (inventoryItem.status !== 'approved') {
            throw new common_1.BadRequestException('El producto indicado no está aprobado para la venta.');
        }
        const availableQuantity = this.toNumber(inventoryItem.quantity);
        if (sanitizedQuantity > availableQuantity) {
            throw new common_1.BadRequestException(`Solo hay ${availableQuantity.toLocaleString('es-ES')} unidades disponibles.`);
        }
        const orderId = (0, crypto_1.randomUUID)();
        const nowIso = new Date().toISOString();
        const orderTotal = dto.unitPrice * sanitizedQuantity;
        const { error: orderError } = await this.salesSupabase
            .from(this.salesOrdersTable)
            .insert({
            id: orderId,
            owner_id: ownerId,
            organization_id: organizationId,
            customer_id: null,
            status: order_status_constant_1.DEFAULT_ORDER_STATUS,
            order_total: orderTotal,
            currency_code: dto.currencyCode,
            order_date: nowIso,
            created_at: nowIso,
        });
        if (orderError) {
            if (this.isSchemaMismatchError(orderError)) {
                console.error('[Commerce] registerSale order schema mismatch', orderError);
            }
            else {
                console.error('[Commerce] registerSale order insert failed', orderError);
            }
            throw new common_1.InternalServerErrorException('No se pudo registrar la venta.');
        }
        const { error: itemError } = await this.salesSupabase
            .from(this.salesOrderItemsTable)
            .insert({
            order_id: orderId,
            owner_id: ownerId,
            organization_id: organizationId,
            sku: inventoryItem.code,
            product_name: inventoryItem.name,
            quantity: sanitizedQuantity,
            unit_price: dto.unitPrice,
            line_total: orderTotal,
            created_at: nowIso,
        });
        if (itemError) {
            console.error('[Commerce] registerSale order items insert failed', itemError);
            await this.salesSupabase
                .from(this.salesOrdersTable)
                .delete()
                .eq('id', orderId);
            throw new common_1.InternalServerErrorException('No se pudo registrar la venta.');
        }
        const nextQuantity = availableQuantity - sanitizedQuantity;
        const { error: updateError } = await this.salesSupabase
            .from(this.inventoryItemsTable)
            .update({ quantity: nextQuantity })
            .eq('id', inventoryItem.id)
            .eq('owner_id', ownerId)
            .eq('organization_id', organizationId);
        if (updateError) {
            console.error('[Commerce] registerSale inventory update failed', updateError);
            throw new common_1.InternalServerErrorException('La venta se registró pero no se pudo actualizar el inventario.');
        }
        return {
            orderId,
            orderTotal,
            currencyCode: dto.currencyCode,
            quantity: sanitizedQuantity,
            remainingQuantity: nextQuantity,
            registeredAt: nowIso,
        };
    }
    async fetchSalesOrders(ownerId, organizationId, from) {
        const { data, error } = await this.salesSupabase
            .from(this.salesOrdersTable)
            .select('*')
            .eq('owner_id', ownerId)
            .eq('organization_id', organizationId)
            .gte('created_at', from.toISOString());
        if (error) {
            if (this.isSchemaMismatchError(error)) {
                console.warn('[Commerce] fetchSalesOrders schema mismatch', error);
                return [];
            }
            console.error('[Commerce] fetchSalesOrders failed', error);
            throw new common_1.InternalServerErrorException('No se pudieron obtener las órdenes de venta.');
        }
        return (data ?? []);
    }
    async fetchSalesOrderItems(ownerId, organizationId, from) {
        const { data, error } = await this.salesSupabase
            .from(this.salesOrderItemsTable)
            .select('*')
            .eq('owner_id', ownerId)
            .eq('organization_id', organizationId)
            .gte('created_at', from.toISOString());
        if (error) {
            if (this.isSchemaMismatchError(error)) {
                console.warn('[Commerce] fetchSalesOrderItems schema mismatch', error);
                return [];
            }
            console.error('[Commerce] fetchSalesOrderItems failed', error);
            throw new common_1.InternalServerErrorException('No se pudieron obtener los productos vendidos.');
        }
        return (data ?? []);
    }
    async fetchCustomers(ownerId, organizationId) {
        const primaryResult = await this.accountsSupabase
            .from(this.customersTable)
            .select('id, owner_id, organization_id, status, segment_key, segment_id, created_at')
            .eq('owner_id', ownerId)
            .eq('organization_id', organizationId);
        if (!primaryResult.error) {
            return (primaryResult.data ?? []);
        }
        if (!this.shouldAttemptFallback(primaryResult.error)) {
            if (this.isSchemaMismatchError(primaryResult.error)) {
                console.warn('[Commerce] fetchCustomers primary schema mismatch', primaryResult.error);
                return [];
            }
            console.error('[Commerce] fetchCustomers primary failed', primaryResult.error);
            throw new common_1.InternalServerErrorException('No se pudieron obtener los clientes.');
        }
        const fallbackResult = await this.salesSupabase
            .from(this.customersTable)
            .select('*')
            .eq('owner_id', ownerId)
            .eq('organization_id', organizationId);
        if (fallbackResult.error) {
            if (this.isSchemaMismatchError(fallbackResult.error)) {
                console.warn('[Commerce] fetchCustomers fallback schema mismatch', fallbackResult.error);
                return [];
            }
            console.error('[Commerce] fetchCustomers fallback failed', fallbackResult.error);
            throw new common_1.InternalServerErrorException('No se pudieron obtener los clientes.');
        }
        return (fallbackResult.data ?? []);
    }
    computeOrderAggregates(orders, customers, currentMonthKey, previousMonthKey) {
        let revenueCurrent = 0;
        let revenuePrevious = 0;
        let ordersCurrent = 0;
        let ordersPrevious = 0;
        let currentTicketAccumulator = 0;
        let previousTicketAccumulator = 0;
        const activeCustomersSet = new Set();
        const currentMonthCustomers = new Set();
        const previousMonthCustomers = new Set();
        orders.forEach((order) => {
            const amount = this.toNumber(order.order_total);
            const monthKey = this.extractMonthKey(order.order_date ?? order.created_at);
            if (monthKey === currentMonthKey) {
                revenueCurrent += amount;
                ordersCurrent += 1;
                currentTicketAccumulator += amount;
                if (order.customer_id) {
                    currentMonthCustomers.add(order.customer_id);
                }
            }
            else if (monthKey === previousMonthKey) {
                revenuePrevious += amount;
                ordersPrevious += 1;
                previousTicketAccumulator += amount;
                if (order.customer_id) {
                    previousMonthCustomers.add(order.customer_id);
                }
            }
            if (order.customer_id) {
                activeCustomersSet.add(order.customer_id);
            }
        });
        const avgTicketCurrent = ordersCurrent > 0 ? currentTicketAccumulator / ordersCurrent : 0;
        const avgTicketPrevious = ordersPrevious > 0 ? previousTicketAccumulator / ordersPrevious : 0;
        const currentCustomers = customers.filter((customer) => this.extractMonthKey(customer.created_at) === currentMonthKey).length;
        const previousCustomers = customers.filter((customer) => this.extractMonthKey(customer.created_at) === previousMonthKey).length;
        const returningCustomers = Array.from(currentMonthCustomers).filter((customerId) => previousMonthCustomers.has(customerId)).length;
        return {
            revenueCurrent,
            revenuePrevious,
            ordersCurrent,
            ordersPrevious,
            avgTicketCurrent,
            avgTicketPrevious,
            newCustomersCurrent: currentCustomers,
            newCustomersPrevious: previousCustomers,
            activeCustomers: activeCustomersSet.size,
            returningCustomers,
        };
    }
    computeMonthlySeries(orders, customers, from, to) {
        const points = [];
        const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
        while (cursor <= to) {
            const monthKey = this.extractMonthKey(cursor.toISOString());
            const label = this.formatMonthLabel(cursor);
            const monthlyOrders = orders.filter((order) => this.extractMonthKey(order.order_date ?? order.created_at) === monthKey);
            const monthlyCustomers = customers.filter((customer) => this.extractMonthKey(customer.created_at) === monthKey);
            const revenue = monthlyOrders.reduce((sum, order) => sum + this.toNumber(order.order_total), 0);
            const ordersCount = monthlyOrders.length;
            const customerCount = monthlyCustomers.length;
            points.push({
                month: monthKey,
                label,
                revenue,
                orders: ordersCount,
                customers: customerCount,
            });
            cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
        return points;
    }
    computeSegmentPerformance(orders, customers) {
        if (orders.length === 0 || customers.length === 0) {
            return [];
        }
        const segmentByCustomer = new Map();
        customers.forEach((customer) => {
            const segment = customer.segment_key ?? customer.segment_id ?? 'Sin segmento';
            segmentByCustomer.set(customer.id, segment);
        });
        const segmentTotals = new Map();
        orders.forEach((order) => {
            const segment = order.customer_id ? segmentByCustomer.get(order.customer_id) ?? 'Sin segmento' : 'Sin segmento';
            const entry = segmentTotals.get(segment) ?? { revenue: 0, customers: new Set(), orders: 0 };
            entry.revenue += this.toNumber(order.order_total);
            entry.orders += 1;
            if (order.customer_id) {
                entry.customers.add(order.customer_id);
            }
            segmentTotals.set(segment, entry);
        });
        const totalRevenue = Array.from(segmentTotals.values()).reduce((sum, entry) => sum + entry.revenue, 0);
        return Array.from(segmentTotals.entries())
            .map(([segment, entry]) => {
            const avgTicket = entry.orders > 0 ? entry.revenue / entry.orders : 0;
            const revenueShare = totalRevenue > 0 ? entry.revenue / totalRevenue : 0;
            return {
                segment,
                customers: entry.customers.size,
                revenue: entry.revenue,
                avgTicket,
                revenueShare,
            };
        })
            .sort((a, b) => b.revenue - a.revenue);
    }
    computeTopProducts(orders, items, currentMonthKey, previousMonthKey) {
        if (orders.length === 0 || items.length === 0) {
            return [];
        }
        const orderMonthLookup = new Map();
        orders.forEach((order) => {
            orderMonthLookup.set(order.id, this.extractMonthKey(order.order_date ?? order.created_at));
        });
        const totals = new Map();
        items.forEach((item) => {
            const monthKey = orderMonthLookup.get(item.order_id);
            if (!monthKey) {
                return;
            }
            const key = item.sku ?? item.product_name ?? item.order_id;
            const name = item.product_name ?? item.sku ?? 'Producto';
            const revenue = this.resolveItemRevenue(item);
            const quantity = this.toNumber(item.quantity);
            const entry = totals.get(key) ?? { name, revenue: 0, quantity: 0, previousRevenue: 0 };
            if (monthKey === currentMonthKey) {
                entry.revenue += revenue;
                entry.quantity += quantity;
            }
            else if (monthKey === previousMonthKey) {
                entry.previousRevenue += revenue;
            }
            totals.set(key, entry);
        });
        const totalCurrentRevenue = Array.from(totals.values()).reduce((sum, entry) => sum + entry.revenue, 0);
        return Array.from(totals.entries())
            .filter(([, entry]) => entry.revenue > 0)
            .map(([sku, entry]) => {
            const growthPct = entry.previousRevenue > 0
                ? this.computeChangePct(entry.previousRevenue, entry.revenue)
                : (entry.previousRevenue === 0 && entry.revenue > 0 ? 100 : null);
            const revenueShare = totalCurrentRevenue > 0 ? entry.revenue / totalCurrentRevenue : 0;
            return {
                sku,
                name: entry.name,
                quantity: entry.quantity,
                revenue: entry.revenue,
                growthPct,
                revenueShare,
            };
        })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }
    buildTemporalContext() {
        const now = new Date();
        const currentMonthKey = this.extractMonthKey(now.toISOString());
        const previousMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const previousMonthKey = this.extractMonthKey(previousMonthDate.toISOString());
        const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
        return { now, currentMonthKey, previousMonthKey, sixMonthsAgo };
    }
    extractMonthKey(input) {
        if (!input) {
            return 'unknown';
        }
        const date = new Date(input);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }
    formatMonthLabel(date) {
        return new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit' }).format(date);
    }
    computeChangePct(previous, current) {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        return ((current - previous) / Math.abs(previous)) * 100;
    }
    toNumber(value) {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            const parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    }
    resolveItemRevenue(item) {
        if (item.line_total !== undefined && item.line_total !== null) {
            return this.toNumber(item.line_total);
        }
        if (item.unit_price !== undefined && item.quantity !== undefined) {
            return this.toNumber(item.unit_price) * this.toNumber(item.quantity);
        }
        return 0;
    }
    isSchemaMismatchError(error) {
        if (!error) {
            return false;
        }
        return error.code === '42703';
    }
    shouldAttemptFallback(error) {
        if (!error) {
            return false;
        }
        const fallbackCodes = new Set(['PGRST114', 'PGRST116', '42P01']);
        return fallbackCodes.has(error.code ?? '');
    }
};
exports.CommerceService = CommerceService;
exports.CommerceService = CommerceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(supabase_constants_1.SUPABASE_DATA_CLIENT)),
    __param(1, (0, common_1.Inject)(supabase_constants_1.SUPABASE_CLIENT)),
    __metadata("design:paramtypes", [supabase_js_1.SupabaseClient,
        supabase_js_1.SupabaseClient])
], CommerceService);
//# sourceMappingURL=commerce.service.js.map