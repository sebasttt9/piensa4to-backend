"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectColumnType = void 0;
const isValidDate = (value) => {
    if (value === null || value === undefined) {
        return false;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return true;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return !Number.isNaN(parsed.getTime());
    }
    return false;
};
const isNumeric = (value) => {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
            return false;
        }
        return !Number.isNaN(Number(trimmed));
    }
    return false;
};
const detectColumnType = (values) => {
    const meaningfulValues = values.filter((value) => value !== null && value !== undefined && `${value}`.trim() !== '');
    if (meaningfulValues.length === 0) {
        return 'string';
    }
    const numericRatio = meaningfulValues.filter(isNumeric).length / meaningfulValues.length;
    if (numericRatio > 0.8) {
        return 'number';
    }
    const dateRatio = meaningfulValues.filter(isValidDate).length / meaningfulValues.length;
    if (dateRatio > 0.6) {
        return 'date';
    }
    return 'string';
};
exports.detectColumnType = detectColumnType;
//# sourceMappingURL=data-type.util.js.map