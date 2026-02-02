"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ORDER_STATUS = void 0;
const envValue = (process.env.ORDER_STATUS_DEFAULT || '').trim().toLowerCase();
const allowed = ['draft', 'pending', 'confirmed', 'fulfilled', 'cancelled'];
exports.DEFAULT_ORDER_STATUS = (allowed.includes(envValue)
    ? envValue
    : 'fulfilled');
//# sourceMappingURL=order-status.constant.js.map