export interface DashboardChartEntity {
    type: string;
    title?: string;
    config: Record<string, unknown>;
}

export interface DashboardEntity {
    id: string;
    ownerId: string;
    name: string;
    description?: string;
    datasetIds: string[];
    layout: Record<string, unknown>;
    charts: DashboardChartEntity[];
    isPublic: boolean;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
}
