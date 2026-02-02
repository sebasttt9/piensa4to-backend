import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { SupabaseModule } from '../database/supabase.module';
import { SharedModule } from '../common/shared.module';

@Module({
    imports: [SupabaseModule, SharedModule],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }
