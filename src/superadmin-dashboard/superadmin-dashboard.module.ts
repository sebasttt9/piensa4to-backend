import { Module } from '@nestjs/common';
import { SuperadminDashboardController, SuperadminDashboardAliasController } from './superadmin-dashboard.controller';
import { SuperadminDashboardService } from './superadmin-dashboard.service';
import { SharedModule } from '../common/shared.module';

@Module({
    imports: [SharedModule],
    controllers: [SuperadminDashboardController, SuperadminDashboardAliasController],
    providers: [SuperadminDashboardService],
})
export class SuperadminDashboardModule { }
