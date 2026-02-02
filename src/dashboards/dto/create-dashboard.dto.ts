import {
  IsArray,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DashboardChartEntity } from '../entities/dashboard.entity';

export class CreateDashboardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  datasetIds?: string[];

  @IsArray()
  @IsOptional()
  charts?: DashboardChartEntity[];

  @IsOptional()
  layout?: Record<string, unknown>;
}
