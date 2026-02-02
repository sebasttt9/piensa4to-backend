import { SupabaseClient } from '@supabase/supabase-js';
import type { AiChatRequestDto } from './dto/ai-chat-request.dto';
import { OpenAiService } from '../common/services/openai.service';
export interface OverviewAnalytics {
    summary: {
        totalDatasets: number;
        activeReports: number;
        createdCharts: number;
        growthPercentage: number;
    };
    financial: {
        totalRevenue: number;
        totalCosts: number;
        netProfit: number;
        monthlySeries: Array<{
            month: string;
            revenue: number;
            costs: number;
        }>;
        quarterlyRevenue: Array<{
            label: string;
            revenue: number;
        }>;
    };
    categoryDistribution: Array<{
        name: string;
        value: number;
    }>;
    datasetHealth: {
        processed: number;
        pending: number;
        error: number;
    };
    storage: {
        usedMb: number;
        capacityMb: number;
        usagePercentage: number;
    };
    lastUpdated: string;
}
export interface AiChatHighlight {
    label: string;
    value: string;
    helper: string;
}
export interface AiChatPayload {
    reply: string;
    highlights: AiChatHighlight[];
    suggestions: string[];
    dataset?: {
        id: string;
        name: string;
        status: 'pending' | 'processed' | 'error';
        rowCount: number | null;
        columnCount: number | null;
        tags: string[];
        updatedAt: string;
    };
}
export declare class AnalyticsService {
    private readonly supabase;
    private readonly openAi;
    constructor(supabase: SupabaseClient, openAi: OpenAiService);
    getOverview(ownerId: string): Promise<OverviewAnalytics>;
    generateAiInsightsChat(ownerId: string, input: AiChatRequestDto): Promise<AiChatPayload>;
    private buildMonthlySeries;
    private calculateGrowth;
    private buildQuarterlyRevenue;
    private calculateStorage;
    private buildCategoryDistribution;
    private fetchDatasetContext;
    private buildChatResponse;
    private generateWithOpenAi;
    private buildAiContext;
    private buildHighlights;
    private buildSuggestions;
    private describeDatasetStatus;
    private formatCurrency;
    private formatNumber;
    private formatPercentage;
}
