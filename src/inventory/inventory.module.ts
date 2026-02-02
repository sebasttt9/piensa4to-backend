import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
    imports: [AnalyticsModule],
    controllers: [InventoryController],
    providers: [InventoryService],
})
export class InventoryModule { }
