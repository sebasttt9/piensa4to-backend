import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { AnalysisService } from './analysis.service';
import { SupabaseModule } from '../database/supabase.module';

@Module({
  imports: [
    ConfigModule,
    SupabaseModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        storage: memoryStorage(),
        limits: {
          fileSize: configService.get<number>('uploads.maxFileSize', 5 * 1024 * 1024),
        },
      }),
    }),
  ],
  controllers: [DatasetsController],
  providers: [DatasetsService, AnalysisService],
  exports: [DatasetsService],
})
export class DatasetsModule { }
