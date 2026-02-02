import { SuperadminDashboardService, SuperadminDashboardOverview } from './superadmin-dashboard.service';
export declare class SuperadminDashboardController {
    private readonly dashboardService;
    constructor(dashboardService: SuperadminDashboardService);
    getOverview(): Promise<SuperadminDashboardOverview>;
}
export declare class SuperadminDashboardAliasController {
    private readonly dashboardService;
    constructor(dashboardService: SuperadminDashboardService);
    getOverview(): Promise<SuperadminDashboardOverview>;
}
