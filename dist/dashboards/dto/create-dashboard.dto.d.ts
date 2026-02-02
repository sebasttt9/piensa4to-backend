import { DashboardChartEntity } from '../entities/dashboard.entity';
export declare class CreateDashboardDto {
    name: string;
    description?: string;
    datasetIds?: string[];
    charts?: DashboardChartEntity[];
    layout?: Record<string, unknown>;
}
