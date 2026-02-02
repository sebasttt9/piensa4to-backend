import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DatasetsModule } from './datasets/datasets.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { SharedModule } from './common/shared.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './database/supabase.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { InventoryModule } from './inventory/inventory.module';
import { IssuesModule } from './issues/issues.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { CommerceModule } from './commerce/commerce.module';
import { SuperadminDashboardModule } from './superadmin-dashboard/superadmin-dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: './.env' }),
    SupabaseModule,
    SharedModule,
    UsersModule,
    AuthModule,
    DatasetsModule,
    DashboardsModule,
    AnalyticsModule,
    InventoryModule,
    IssuesModule,
    OrganizationsModule,
    CommerceModule,
    SuperadminDashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
