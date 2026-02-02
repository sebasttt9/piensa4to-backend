import { DetectedColumnType } from '../../common/utils/data-type.util';

export interface ColumnStats {
  column: string;
  type: DetectedColumnType;
  uniqueValues: number;
  emptyValues: number;
  sampleValues: unknown[];
  summary?: NumericSummary | CategoricalSummary | DateSummary;
}

export interface NumericSummary {
  min: number;
  max: number;
  average: number;
  sum: number;
  count: number;
}

export interface CategoricalSummary {
  topValues: Array<{ value: string; count: number }>;
}

export interface DateSummary {
  start: string;
  end: string;
  granularity: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface ChartSuggestion {
  type: 'line' | 'bar' | 'pie' | 'area' | 'table';
  label: string;
  xAxis: string;
  yAxis: string | string[];
  description: string;
}

export interface DatasetAnalysis {
  rowCount: number;
  columns: ColumnStats[];
  chartSuggestions: ChartSuggestion[];
}
