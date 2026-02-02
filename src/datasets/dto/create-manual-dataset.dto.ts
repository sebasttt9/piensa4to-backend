import { IsArray, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ManualColumnDto {
    @IsString()
    @MaxLength(50)
    name: string;

    @IsString()
    @MaxLength(20)
    type: 'string' | 'number' | 'boolean' | 'date';

    @IsOptional()
    @IsString()
    @MaxLength(100)
    description?: string;
}

export class CreateManualDatasetDto {
    @IsString()
    @MaxLength(100)
    name: string;

    @IsOptional()
    @IsString()
    @MaxLength(300)
    description?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ManualColumnDto)
    columns: ManualColumnDto[];

    @IsArray()
    @IsObject({ each: true })
    data: Record<string, any>[];
}