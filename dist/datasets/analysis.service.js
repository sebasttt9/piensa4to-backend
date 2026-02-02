"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisService = void 0;
const common_1 = require("@nestjs/common");
const data_type_util_1 = require("../common/utils/data-type.util");
let AnalysisService = class AnalysisService {
    analyse(rows) {
        const rowCount = rows.length;
        const columns = this.extractColumns(rows);
        const columnStats = columns.map((column) => this.buildColumnStats(column, rows));
        const chartSuggestions = this.buildChartSuggestions(columnStats);
        return { rowCount, columns: columnStats, chartSuggestions };
    }
    extractColumns(rows) {
        if (rows.length === 0)
            return [];
        return Object.keys(rows[0]);
    }
    buildColumnStats(column, rows) {
        const values = rows.map((row) => row[column]);
        const type = (0, data_type_util_1.detectColumnType)(values);
        const meaningfulValues = values.filter((value) => value !== null && value !== undefined && value !== '');
        const emptyValues = values.length - meaningfulValues.length;
        const sampleValues = meaningfulValues.slice(0, 5);
        const baseStats = {
            column,
            type,
            emptyValues,
            uniqueValues: new Set(meaningfulValues.map((value) => String(value)))
                .size,
            sampleValues,
        };
        if (type === 'number') {
            baseStats.summary = this.buildNumericSummary(meaningfulValues);
        }
        else if (type === 'date') {
            baseStats.summary = this.buildDateSummary(meaningfulValues);
        }
        else {
            baseStats.summary = this.buildCategoricalSummary(meaningfulValues);
        }
        return baseStats;
    }
    buildNumericSummary(values) {
        const numericValues = values
            .map((value) => typeof value === 'number' ? value : Number(String(value)))
            .filter((value) => Number.isFinite(value));
        const count = numericValues.length;
        if (count === 0) {
            return { min: 0, max: 0, average: 0, sum: 0, count: 0 };
        }
        const sum = numericValues.reduce((acc, value) => acc + value, 0);
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        return {
            min,
            max,
            sum,
            count,
            average: sum / count,
        };
    }
    buildDateSummary(values) {
        const dates = values
            .map((value) => value instanceof Date ? value : new Date(String(value)))
            .filter((value) => !Number.isNaN(value.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());
        if (dates.length === 0) {
            const now = new Date().toISOString();
            return { start: now, end: now, granularity: 'month' };
        }
        const start = dates[0].toISOString();
        const end = dates[dates.length - 1].toISOString();
        const diffInDays = (dates[dates.length - 1].getTime() - dates[0].getTime()) /
            (1000 * 60 * 60 * 24);
        let granularity = 'day';
        if (diffInDays > 365 * 2) {
            granularity = 'year';
        }
        else if (diffInDays > 180) {
            granularity = 'quarter';
        }
        else if (diffInDays > 90) {
            granularity = 'month';
        }
        else if (diffInDays > 30) {
            granularity = 'week';
        }
        return { start, end, granularity };
    }
    buildCategoricalSummary(values) {
        const frequencyMap = new Map();
        for (const value of values) {
            const key = String(value);
            frequencyMap.set(key, (frequencyMap.get(key) ?? 0) + 1);
        }
        const topValues = Array.from(frequencyMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([value, count]) => ({ value, count }));
        return { topValues };
    }
    buildChartSuggestions(columns) {
        const suggestions = [];
        const numericColumns = columns.filter((column) => column.type === 'number');
        const dateColumns = columns.filter((column) => column.type === 'date');
        const categoricalColumns = columns.filter((column) => column.type === 'string');
        if (dateColumns.length > 0 && numericColumns.length > 0) {
            for (const dateCol of dateColumns) {
                for (const numericCol of numericColumns) {
                    suggestions.push({
                        type: 'line',
                        label: `${numericCol.column} por ${dateCol.column}`,
                        xAxis: dateCol.column,
                        yAxis: numericCol.column,
                        description: 'Serie temporal',
                    });
                }
            }
        }
        if (categoricalColumns.length > 0 && numericColumns.length > 0) {
            for (const catCol of categoricalColumns) {
                for (const numericCol of numericColumns) {
                    suggestions.push({
                        type: 'bar',
                        label: `${numericCol.column} por ${catCol.column}`,
                        xAxis: catCol.column,
                        yAxis: numericCol.column,
                        description: 'Comparación de categorías',
                    });
                }
            }
        }
        if (suggestions.length === 0 && numericColumns.length >= 2) {
            suggestions.push({
                type: 'area',
                label: `${numericColumns[0].column} vs ${numericColumns[1].column}`,
                xAxis: numericColumns[0].column,
                yAxis: numericColumns[1].column,
                description: 'Comparación directa',
            });
        }
        if (suggestions.length === 0) {
            suggestions.push({
                type: 'table',
                label: 'Vista tabular',
                xAxis: 'rows',
                yAxis: columns.map((column) => column.column),
                description: 'Exploración básica',
            });
        }
        return suggestions.slice(0, 10);
    }
    async analyzeDataset(rows, manualColumns) {
        const rowCount = rows.length;
        let columnStats;
        if (manualColumns && manualColumns.length > 0) {
            columnStats = manualColumns.map((column) => this.buildManualColumnStats(column, rows));
        }
        else {
            const columns = this.extractColumns(rows);
            columnStats = columns.map((column) => this.buildColumnStats(column, rows));
        }
        const chartSuggestions = this.buildChartSuggestions(columnStats);
        return { rowCount, columns: columnStats, chartSuggestions };
    }
    buildManualColumnStats(columnDef, rows) {
        const values = rows.map((row) => row[columnDef.name]);
        const meaningfulValues = values.filter((value) => value !== null && value !== undefined && value !== '');
        const emptyValues = values.length - meaningfulValues.length;
        const sampleValues = meaningfulValues.slice(0, 5);
        const type = this.mapManualTypeToSystemType(columnDef.type);
        const baseStats = {
            column: columnDef.name,
            type,
            emptyValues,
            uniqueValues: new Set(meaningfulValues.map((value) => String(value)))
                .size,
            sampleValues,
        };
        if (type === 'number') {
            const numericValues = meaningfulValues
                .map((value) => {
                const num = typeof value === 'number' ? value : parseFloat(String(value));
                return isNaN(num) ? null : num;
            })
                .filter((value) => value !== null);
            if (numericValues.length > 0) {
                const summary = {
                    min: Math.min(...numericValues),
                    max: Math.max(...numericValues),
                    average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
                    sum: numericValues.reduce((a, b) => a + b, 0),
                    count: numericValues.length,
                };
                baseStats.summary = summary;
            }
        }
        else if (type === 'string') {
            const valueCounts = {};
            meaningfulValues.forEach((value) => {
                const key = String(value);
                valueCounts[key] = (valueCounts[key] || 0) + 1;
            });
            const topValues = Object.entries(valueCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([value, count]) => ({ value, count }));
            const summary = {
                topValues,
            };
            baseStats.summary = summary;
        }
        else if (type === 'date') {
            const dateValues = meaningfulValues
                .map((value) => new Date(value))
                .filter((date) => !isNaN(date.getTime()));
            if (dateValues.length > 0) {
                const sortedDates = dateValues.sort((a, b) => a.getTime() - b.getTime());
                const summary = {
                    start: sortedDates[0].toISOString(),
                    end: sortedDates[sortedDates.length - 1].toISOString(),
                    granularity: 'day',
                };
                baseStats.summary = summary;
            }
        }
        return baseStats;
    }
    mapManualTypeToSystemType(manualType) {
        switch (manualType) {
            case 'number':
                return 'number';
            case 'boolean':
            case 'string':
                return 'string';
            case 'date':
                return 'date';
            default:
                return 'string';
        }
    }
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    calculateStd(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }
};
exports.AnalysisService = AnalysisService;
exports.AnalysisService = AnalysisService = __decorate([
    (0, common_1.Injectable)()
], AnalysisService);
//# sourceMappingURL=analysis.service.js.map