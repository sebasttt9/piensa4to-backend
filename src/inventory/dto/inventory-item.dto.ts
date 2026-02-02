import { IsString, IsNumber, IsUUID, IsOptional, Min, IsNotEmpty, IsIn } from 'class-validator';

export class CreateInventoryItemDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    code: string;

    @IsNumber()
    @Min(0)
    quantity: number;

    @IsNumber()
    @Min(0)
    pvp: number;

    @IsNumber()
    @Min(0)
    cost: number;

    @IsUUID('4', { message: 'El dataset debe ser un UUID válido' })
    @IsOptional()
    datasetId?: string;

    @IsUUID('4', { message: 'El dashboard debe ser un UUID válido' })
    @IsOptional()
    dashboardId?: string;
}

export class UpdateInventoryItemDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    quantity?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    pvp?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    cost?: number;

    @IsUUID('4', { message: 'El dataset debe ser un UUID válido' })
    @IsOptional()
    datasetId?: string;

    @IsUUID('4', { message: 'El dashboard debe ser un UUID válido' })
    @IsOptional()
    dashboardId?: string;
}

export class ApproveInventoryItemDto {
    @IsIn(['approved', 'rejected'])
    status: 'approved' | 'rejected';
}