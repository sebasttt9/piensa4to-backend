import { DatasetAnalysis } from './interfaces/dataset-analysis.interface';
import { ManualColumnDto } from './dto/create-manual-dataset.dto';
export declare class AnalysisService {
    analyse(rows: Record<string, unknown>[]): DatasetAnalysis;
    private extractColumns;
    private buildColumnStats;
    private buildNumericSummary;
    private buildDateSummary;
    private buildCategoricalSummary;
    private buildChartSuggestions;
    analyzeDataset(rows: Record<string, unknown>[], manualColumns?: ManualColumnDto[]): Promise<DatasetAnalysis>;
    private buildManualColumnStats;
    private mapManualTypeToSystemType;
    private calculateMedian;
    private calculateStd;
}
