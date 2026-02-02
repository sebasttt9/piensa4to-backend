import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles.enum';
import { SuperadminDashboardService, SuperadminDashboardOverview } from './superadmin-dashboard.service';

@Controller('superadmin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuperadminDashboardController {
    constructor(private readonly dashboardService: SuperadminDashboardService) { }

    @Get('overview')
    @Roles(UserRole.SuperAdmin)
    getOverview(): Promise<SuperadminDashboardOverview> {
        return this.dashboardService.getOverview();
    }
}

@Controller('superadmin-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuperadminDashboardAliasController {
    constructor(private readonly dashboardService: SuperadminDashboardService) { }

    @Get('overview')
    @Roles(UserRole.SuperAdmin)
    getOverview(): Promise<SuperadminDashboardOverview> {
        return this.dashboardService.getOverview();
    }
}
