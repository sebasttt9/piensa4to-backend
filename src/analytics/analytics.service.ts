import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_DATA_CLIENT } from '../database/supabase.constants';
import { DashboardChartEntity } from '../dashboards/entities/dashboard.entity';
import type { AiChatRequestDto } from './dto/ai-chat-request.dto';
import type { DatasetAnalysis } from '../datasets/interfaces/dataset-analysis.interface';
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
        monthlySeries: Array<{ month: string; revenue: number; costs: number }>;
        quarterlyRevenue: Array<{ label: string; revenue: number }>;
    };
    categoryDistribution: Array<{ name: string; value: number }>;
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

interface DatasetSummary {
    status: 'pending' | 'processed' | 'error';
    fileSize?: number;
    tags?: string[];
}

interface DashboardSummary {
    charts?: DashboardChartEntity[] | null;
}

export interface AiChatHighlight {
    label: string;
    value: string;
    helper: string;
}

interface DatasetContext {
    id: string;
    name: string;
    status: 'pending' | 'processed' | 'error';
    rowCount: number | null;
    columnCount: number | null;
    tags: string[];
    updatedAt: string;
    analysis?: DatasetAnalysis | null;
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

@Injectable()
export class AnalyticsService {
    constructor(
        @Inject(SUPABASE_DATA_CLIENT)
        private readonly supabase: SupabaseClient,
        private readonly openAi: OpenAiService,
    ) { }

    async getOverview(ownerId: string): Promise<OverviewAnalytics> {
        const [datasetsResponse, dashboardsResponse] = await Promise.all([
            this.supabase
                .from('datasets')
                .select('status, file_size, tags')
                .eq('owner_id', ownerId),
            this.supabase
                .from('dashboards')
                .select('charts')
                .eq('owner_id', ownerId),
        ]);

        if (datasetsResponse.error) {
            throw new InternalServerErrorException('No se pudo obtener la información de datasets');
        }

        if (dashboardsResponse.error) {
            throw new InternalServerErrorException('No se pudo obtener la información de dashboards');
        }

        const datasets: DatasetSummary[] = ((datasetsResponse.data ?? []) as Array<{
            status: 'pending' | 'processed' | 'error';
            file_size: number | null;
            tags: string[] | null;
        }>).map((dataset) => ({
            status: dataset.status,
            fileSize: dataset.file_size ?? undefined,
            tags: dataset.tags ?? undefined,
        }));

        const dashboards: DashboardSummary[] = (dashboardsResponse.data ?? []) as DashboardSummary[];

        const monthlySeries = this.buildMonthlySeries();
        const totalRevenue = monthlySeries.reduce((acc, item) => acc + item.revenue, 0);
        const totalCosts = monthlySeries.reduce((acc, item) => acc + item.costs, 0);
        const netProfit = totalRevenue - totalCosts;
        const growthPercentage = this.calculateGrowth(monthlySeries);
        const quarterlyRevenue = this.buildQuarterlyRevenue(monthlySeries);
        const storage = this.calculateStorage(datasets);
        const categoryDistribution = this.buildCategoryDistribution(datasets);

        return {
            summary: {
                totalDatasets: datasets.length,
                activeReports: dashboards.length,
                createdCharts: dashboards.reduce(
                    (acc, dashboard) => acc + (dashboard.charts?.length ?? 0),
                    0,
                ),
                growthPercentage,
            },
            financial: {
                totalRevenue,
                totalCosts,
                netProfit,
                monthlySeries,
                quarterlyRevenue,
            },
            categoryDistribution,
            datasetHealth: {
                processed: datasets.filter((dataset) => dataset.status === 'processed').length,
                pending: datasets.filter((dataset) => dataset.status === 'pending').length,
                error: datasets.filter((dataset) => dataset.status === 'error').length,
            },
            storage,
            lastUpdated: new Date().toISOString(),
        };
    }

    async generateAiInsightsChat(ownerId: string, input: AiChatRequestDto): Promise<AiChatPayload> {
        const message = input.message?.trim() ?? '';
        if (!message) {
            throw new BadRequestException('El mensaje no puede estar vacío');
        }

        const overview = await this.getOverview(ownerId);
        const datasetContext = input.datasetId
            ? await this.fetchDatasetContext(ownerId, input.datasetId)
            : null;

        const { reply: fallbackReply, highlights, suggestions } = this.buildChatResponse(
            message,
            overview,
            datasetContext,
        );

        const aiReply = await this.generateWithOpenAi(message, overview, datasetContext, fallbackReply);

        return {
            reply: aiReply,
            highlights,
            suggestions,
            dataset: datasetContext
                ? {
                    id: datasetContext.id,
                    name: datasetContext.name,
                    status: datasetContext.status,
                    rowCount: datasetContext.rowCount,
                    columnCount: datasetContext.columnCount,
                    tags: datasetContext.tags,
                    updatedAt: datasetContext.updatedAt,
                }
                : undefined,
        };
    }

    private buildMonthlySeries(): Array<{ month: string; revenue: number; costs: number }> {
        return [
            { month: 'Ene', revenue: 42000, costs: 26000 },
            { month: 'Feb', revenue: 45000, costs: 28000 },
            { month: 'Mar', revenue: 51000, costs: 31000 },
            { month: 'Abr', revenue: 56000, costs: 33000 },
            { month: 'May', revenue: 59000, costs: 34000 },
            { month: 'Jun', revenue: 64000, costs: 36000 },
        ];
    }

    private calculateGrowth(series: Array<{ revenue: number }>): number {
        if (series.length < 2) {
            return 0;
        }

        const first = series[0].revenue;
        const last = series[series.length - 1].revenue;

        if (first === 0) {
            return 0;
        }

        return Number((((last - first) / first) * 100).toFixed(1));
    }

    private buildQuarterlyRevenue(
        series: Array<{ month: string; revenue: number }>,
    ): Array<{ label: string; revenue: number }> {
        const chunks = [
            { label: 'Q1', months: series.slice(0, 3) },
            { label: 'Q2', months: series.slice(3, 6) },
        ];

        return chunks
            .filter((chunk) => chunk.months.length > 0)
            .map((chunk) => ({
                label: chunk.label,
                revenue: chunk.months.reduce((acc, item) => acc + item.revenue, 0),
            }));
    }

    private calculateStorage(
        datasets: Array<{ fileSize?: number }>,
    ): { usedMb: number; capacityMb: number; usagePercentage: number } {
        const usedBytes = datasets.reduce((acc, dataset) => acc + (dataset.fileSize ?? 0), 0);
        const usedMb = Number((usedBytes / (1024 * 1024)).toFixed(1));
        const capacityMb = 1024;
        const usagePercentageRaw = capacityMb <= 0
            ? 0
            : Number(((usedMb / capacityMb) * 100).toFixed(1));

        return {
            usedMb,
            capacityMb,
            usagePercentage: Math.min(100, usagePercentageRaw),
        };
    }

    private buildCategoryDistribution(
        datasets: Array<{ tags?: string[] }>,
    ): Array<{ name: string; value: number }> {
        const tagCounter = new Map<string, number>();

        for (const dataset of datasets) {
            if (!dataset.tags || dataset.tags.length === 0) {
                continue;
            }

            for (const tag of dataset.tags) {
                tagCounter.set(tag, (tagCounter.get(tag) ?? 0) + 1);
            }
        }

        if (tagCounter.size === 0) {
            return [
                { name: 'Productos', value: 45 },
                { name: 'Servicios', value: 30 },
                { name: 'Consultoría', value: 25 },
            ];
        }

        const total = Array.from(tagCounter.values()).reduce((acc, value) => acc + value, 0);

        return Array.from(tagCounter.entries()).map(([name, value]) => ({
            name,
            value: Number(((value / total) * 100).toFixed(1)),
        }));
    }

    private async fetchDatasetContext(ownerId: string, datasetId: string): Promise<DatasetContext | null> {
        const { data, error } = await this.supabase
            .from('datasets')
            .select('id, name, status, row_count, column_count, tags, updated_at, analysis')
            .eq('id', datasetId)
            .eq('owner_id', ownerId)
            .maybeSingle();

        if (error) {
            throw new InternalServerErrorException('No se pudo obtener la información del dataset solicitado');
        }

        if (!data) {
            return null;
        }

        return {
            id: data.id as string,
            name: (data.name as string) ?? 'Dataset sin nombre',
            status: data.status as DatasetContext['status'],
            rowCount: (data.row_count as number | null) ?? null,
            columnCount: (data.column_count as number | null) ?? null,
            tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
            updatedAt: (data.updated_at as string) ?? new Date().toISOString(),
            analysis: (data.analysis as DatasetAnalysis | null) ?? null,
        };
    }

    private buildChatResponse(
        message: string,
        overview: OverviewAnalytics,
        dataset: DatasetContext | null,
    ): { reply: string; highlights: AiChatHighlight[]; suggestions: string[] } {
        const normalizedMessage = message.toLowerCase();
        const segments: string[] = [];

        if (dataset) {
            const rowInfo = dataset.rowCount !== null
                ? `${this.formatNumber(dataset.rowCount)} registros`
                : 'sin registros contabilizados';
            const columnInfo = dataset.columnCount !== null
                ? `${dataset.columnCount} columnas`
                : 'columnas no especificadas';
            segments.push(
                `He revisado el dataset "${dataset.name}": contiene ${rowInfo} y ${columnInfo}. ` +
                `Su estado actual es ${this.describeDatasetStatus(dataset.status)}.`,
            );

            if (dataset.tags.length > 0) {
                const tagList = dataset.tags.slice(0, 4).join(', ');
                segments.push(`Etiquetas principales: ${tagList}.`);
            }
        } else {
            segments.push('He revisado tu estado analítico general.');
        }

        const { processed, pending, error } = overview.datasetHealth;
        const totalDatasets = processed + pending + error;
        const processedRatio = totalDatasets === 0 ? 0 : (processed / totalDatasets) * 100;

        segments.push(
            `Actualmente tienes ${processed} datasets procesados${totalDatasets > 0 ? ` (${Math.round(processedRatio)}% del total)` : ''}, ` +
            `${pending} pendientes y ${error} marcados con errores.`,
        );

        segments.push(
            `La ganancia neta acumulada es ${this.formatCurrency(overview.financial.netProfit)} ` +
            `con un crecimiento de ${this.formatPercentage(overview.summary.growthPercentage)} durante el período evaluado.`,
        );

        if (overview.summary.growthPercentage < 0) {
            segments.push('El crecimiento está en terreno negativo, conviene revisar costos y campañas activas.');
        } else if (overview.summary.growthPercentage > 12) {
            segments.push('El crecimiento es sólido; aprovecha para planificar nuevas iniciativas comerciales.');
        }

        if (error > 0 || normalizedMessage.includes('alert') || normalizedMessage.includes('riesg')) {
            segments.push(`Hay ${error} dataset(s) con errores; te sugiero priorizar su corrección para evitar sesgos en los reportes.`);
        }

        if (normalizedMessage.includes('anom')) {
            segments.push('No detecto anomalías significativas en la tendencia principal, pero monitorea las métricas con variaciones bruscas.');
        }

        if (normalizedMessage.includes('recom') || normalizedMessage.includes('accion')) {
            segments.push('Puedes transformar estos hallazgos en acciones concretas activando campañas segmentadas o creando tableros temáticos.');
        }

        if (dataset?.analysis?.chartSuggestions?.length) {
            const suggestion = dataset.analysis.chartSuggestions[0];
            const yAxis = Array.isArray(suggestion.yAxis)
                ? suggestion.yAxis.join(' y ')
                : suggestion.yAxis;
            segments.push(
                `Te recomiendo explorar un gráfico ${suggestion.type} para ${suggestion.label.toLowerCase()}, ` +
                `relacionando ${suggestion.xAxis} con ${yAxis}.`,
            );
        }

        const reply = segments.join(' ');
        const highlights = this.buildHighlights(overview, dataset);
        const suggestions = this.buildSuggestions(normalizedMessage, overview, dataset);

        return { reply, highlights, suggestions };
    }

    private async generateWithOpenAi(
        message: string,
        overview: OverviewAnalytics,
        dataset: DatasetContext | null,
        fallback: string,
    ): Promise<string> {
        const systemPrompt = 'Eres un analista de datos que responde en español con tono profesional y claro.';
        const context = this.buildAiContext(overview, dataset);
        const userPrompt = `${context}\n\nPregunta del usuario: ${message}`;
        const result = await this.openAi.generateText(systemPrompt, userPrompt);

        if (!result) {
            return fallback;
        }

        return `${result}\n\nResumen clave: ${fallback}`.trim();
    }

    private buildAiContext(overview: OverviewAnalytics, dataset: DatasetContext | null): string {
        const summary = [
            `Resumen general: ${overview.summary.totalDatasets} datasets, ${overview.summary.activeReports} reportes activos, ` +
            `${overview.summary.createdCharts} gráficos creados, crecimiento ${this.formatPercentage(overview.summary.growthPercentage)}.`,
            `Finanzas: ingresos ${this.formatCurrency(overview.financial.totalRevenue)}, costos ${this.formatCurrency(overview.financial.totalCosts)}, ` +
            `ganancia ${this.formatCurrency(overview.financial.netProfit)}.`,
            `Salud de datasets: procesados ${overview.datasetHealth.processed}, pendientes ${overview.datasetHealth.pending}, errores ${overview.datasetHealth.error}.`,
        ];

        if (dataset) {
            summary.push(
                `Dataset enfocado: ${dataset.name} (${dataset.status}) con ${dataset.rowCount ?? 0} filas y ${dataset.columnCount ?? 0} columnas. ` +
                `Etiquetas: ${dataset.tags.slice(0, 5).join(', ') || 'sin etiquetas'}.`,
            );
        }

        return summary.join('\n');
    }

    private buildHighlights(overview: OverviewAnalytics, dataset: DatasetContext | null): AiChatHighlight[] {
        const { processed, pending, error } = overview.datasetHealth;
        const totalDatasets = processed + pending + error;
        const processedRatio = totalDatasets === 0 ? 0 : (processed / totalDatasets) * 100;

        const highlights: AiChatHighlight[] = [
            {
                label: 'Ganancia neta',
                value: this.formatCurrency(overview.financial.netProfit),
                helper: `Crecimiento ${this.formatPercentage(overview.summary.growthPercentage)}`,
            },
            {
                label: 'Datasets listos',
                value: `${processed}/${totalDatasets}`,
                helper: `${Math.round(processedRatio)}% procesados`,
            },
        ];

        if (dataset) {
            const rowInfo = dataset.rowCount !== null ? this.formatNumber(dataset.rowCount) : 'Sin datos';
            const columnInfo = dataset.columnCount !== null ? `${dataset.columnCount} columnas` : 'Columnas sin definir';
            highlights.unshift({
                label: dataset.name,
                value: `${rowInfo} registros`,
                helper: columnInfo,
            });
        } else {
            highlights.push({
                label: 'Pendientes',
                value: `${pending}`,
                helper: error > 0 ? `${error} con errores` : 'Sin errores registrados',
            });
        }

        return highlights.slice(0, 3);
    }

    private buildSuggestions(
        normalizedMessage: string,
        overview: OverviewAnalytics,
        dataset: DatasetContext | null,
    ): string[] {
        const suggestions = new Set<string>();

        suggestions.add('Resume el desempeño financiero');
        suggestions.add('Muestra los datasets que requieren atención');

        if (dataset) {
            suggestions.add(`¿Qué métricas clave tiene ${dataset.name}?`);
        }

        if (overview.datasetHealth.pending > 0) {
            suggestions.add('Prioriza el análisis de los datasets pendientes');
        }

        if (overview.datasetHealth.error > 0) {
            suggestions.add('Ayúdame a corregir los datasets con errores');
        }

        if (normalizedMessage.includes('recom')) {
            suggestions.add('Genera un plan de acción por área');
        }

        if (normalizedMessage.includes('anom')) {
            suggestions.add('¿Qué anomalías debería vigilar?');
        }

        return Array.from(suggestions).slice(0, 4);
    }

    private describeDatasetStatus(status: DatasetContext['status']): string {
        switch (status) {
            case 'processed':
                return 'procesado';
            case 'pending':
                return 'pendiente de análisis';
            case 'error':
                return 'con errores';
            default:
                return status;
        }
    }

    private formatCurrency(value: number): string {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    }

    private formatNumber(value: number): string {
        return value.toLocaleString('es-ES');
    }

    private formatPercentage(value: number): string {
        return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;
    }
}
