import { Injectable } from '@nestjs/common';
import { detectColumnType } from '../common/utils/data-type.util';
import {
  ChartSuggestion,
  ColumnStats,
  DatasetAnalysis,
  NumericSummary,
  DateSummary,
  CategoricalSummary,
} from './interfaces/dataset-analysis.interface';
import { ManualColumnDto } from './dto/create-manual-dataset.dto';

@Injectable()
export class AnalysisService {
  analyse(rows: Record<string, unknown>[]): DatasetAnalysis {
    const rowCount = rows.length;
    const columns = this.extractColumns(rows);
    const columnStats = columns.map((column) =>
      this.buildColumnStats(column, rows),
    );
    const chartSuggestions = this.buildChartSuggestions(columnStats);

    return { rowCount, columns: columnStats, chartSuggestions };
  }

  private extractColumns(rows: Record<string, unknown>[]): string[] {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]);
  }

  private buildColumnStats(
    column: string,
    rows: Record<string, unknown>[],
  ): ColumnStats {
    const values = rows.map((row) => row[column]);
    const type = detectColumnType(values);
    const meaningfulValues = values.filter(
      (value) => value !== null && value !== undefined && value !== '',
    );
    const emptyValues = values.length - meaningfulValues.length;
    const sampleValues = meaningfulValues.slice(0, 5);

    const baseStats: ColumnStats = {
      column,
      type,
      emptyValues,
      uniqueValues: new Set(meaningfulValues.map((value) => String(value)))
        .size,
      sampleValues,
    };

    if (type === 'number') {
      baseStats.summary = this.buildNumericSummary(meaningfulValues);
    } else if (type === 'date') {
      baseStats.summary = this.buildDateSummary(meaningfulValues);
    } else {
      baseStats.summary = this.buildCategoricalSummary(meaningfulValues);
    }

    return baseStats;
  }

  private buildNumericSummary(values: unknown[]): NumericSummary {
    const numericValues = values
      .map((value) =>
        typeof value === 'number' ? value : Number(String(value)),
      )
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

  private buildDateSummary(values: unknown[]): DateSummary {
    const dates = values
      .map((value) =>
        value instanceof Date ? value : new Date(String(value)),
      )
      .filter((value) => !Number.isNaN(value.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) {
      const now = new Date().toISOString();
      return { start: now, end: now, granularity: 'month' };
    }

    const start = dates[0].toISOString();
    const end = dates[dates.length - 1].toISOString();
    const diffInDays =
      (dates[dates.length - 1].getTime() - dates[0].getTime()) /
      (1000 * 60 * 60 * 24);

    let granularity: DateSummary['granularity'] = 'day';
    if (diffInDays > 365 * 2) {
      granularity = 'year';
    } else if (diffInDays > 180) {
      granularity = 'quarter';
    } else if (diffInDays > 90) {
      granularity = 'month';
    } else if (diffInDays > 30) {
      granularity = 'week';
    }

    return { start, end, granularity };
  }

  private buildCategoricalSummary(values: unknown[]): CategoricalSummary {
    const frequencyMap = new Map<string, number>();

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

  private buildChartSuggestions(columns: ColumnStats[]): ChartSuggestion[] {
    const suggestions: ChartSuggestion[] = [];
    const numericColumns = columns.filter((column) => column.type === 'number');
    const dateColumns = columns.filter((column) => column.type === 'date');
    const categoricalColumns = columns.filter(
      (column) => column.type === 'string',
    );

    // Time series: date + numeric
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

    // Category comparison: categorical + numeric
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

    // Direct comparison: numeric vs numeric
    if (suggestions.length === 0 && numericColumns.length >= 2) {
      suggestions.push({
        type: 'area',
        label: `${numericColumns[0].column} vs ${numericColumns[1].column}`,
        xAxis: numericColumns[0].column,
        yAxis: numericColumns[1].column,
        description: 'Comparación directa',
      });
    }

    // Fallback: table view
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

  async analyzeDataset(
    rows: Record<string, unknown>[],
    manualColumns?: ManualColumnDto[],
  ): Promise<DatasetAnalysis> {
    const rowCount = rows.length;

    let columnStats: ColumnStats[];

    if (manualColumns && manualColumns.length > 0) {
      // Usar columnas definidas manualmente
      columnStats = manualColumns.map((column) =>
        this.buildManualColumnStats(column, rows),
      );
    } else {
      // Extraer columnas automáticamente de los datos
      const columns = this.extractColumns(rows);
      columnStats = columns.map((column) =>
        this.buildColumnStats(column, rows),
      );
    }

    const chartSuggestions = this.buildChartSuggestions(columnStats);

    return { rowCount, columns: columnStats, chartSuggestions };
  }

  private buildManualColumnStats(
    columnDef: ManualColumnDto,
    rows: Record<string, unknown>[],
  ): ColumnStats {
    const values = rows.map((row) => row[columnDef.name]);
    const meaningfulValues = values.filter(
      (value) => value !== null && value !== undefined && value !== '',
    );
    const emptyValues = values.length - meaningfulValues.length;
    const sampleValues = meaningfulValues.slice(0, 5);

    // Convertir el tipo manual a los tipos del sistema
    const type = this.mapManualTypeToSystemType(columnDef.type);

    const baseStats: ColumnStats = {
      column: columnDef.name,
      type,
      emptyValues,
      uniqueValues: new Set(meaningfulValues.map((value) => String(value)))
        .size,
      sampleValues,
    };

    // Agregar estadísticas específicas según el tipo
    if (type === 'number') {
      const numericValues = meaningfulValues
        .map((value) => {
          const num = typeof value === 'number' ? value : parseFloat(String(value));
          return isNaN(num) ? null : num;
        })
        .filter((value) => value !== null) as number[];

      if (numericValues.length > 0) {
        const summary: NumericSummary = {
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
          sum: numericValues.reduce((a, b) => a + b, 0),
          count: numericValues.length,
        };
        baseStats.summary = summary;
      }
    } else if (type === 'string') {
      const valueCounts: Record<string, number> = {};
      meaningfulValues.forEach((value) => {
        const key = String(value);
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      });

      const topValues = Object.entries(valueCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([value, count]) => ({ value, count }));

      const summary: CategoricalSummary = {
        topValues,
      };
      baseStats.summary = summary;
    } else if (type === 'date') {
      const dateValues = meaningfulValues
        .map((value) => new Date(value as string | number | Date))
        .filter((date) => !isNaN(date.getTime()));

      if (dateValues.length > 0) {
        const sortedDates = dateValues.sort((a, b) => a.getTime() - b.getTime());
        const summary: DateSummary = {
          start: sortedDates[0].toISOString(),
          end: sortedDates[sortedDates.length - 1].toISOString(),
          granularity: 'day', // Default granularity
        };
        baseStats.summary = summary;
      }
    }

    return baseStats;
  }

  private mapManualTypeToSystemType(manualType: string): 'number' | 'date' | 'string' {
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

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calculateStd(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
}
