import { Module } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { DashboardsController } from './dashboards.controller';
import { DatasetsModule } from '../datasets/datasets.module';
import { SupabaseModule } from '../database/supabase.module';

@Module({
  imports: [SupabaseModule, DatasetsModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
  exports: [DashboardsService],
})
export class DashboardsModule { }
