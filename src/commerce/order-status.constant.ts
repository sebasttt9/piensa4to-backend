
export type OrderStatus = 'draft' | 'pending' | 'confirmed' | 'fulfilled' | 'cancelled';

const envValue = (process.env.ORDER_STATUS_DEFAULT || '').trim().toLowerCase();
const allowed: OrderStatus[] = ['draft', 'pending', 'confirmed', 'fulfilled', 'cancelled'];

export const DEFAULT_ORDER_STATUS: OrderStatus = (allowed.includes(envValue as OrderStatus)
    ? (envValue as OrderStatus)
    : 'fulfilled');
