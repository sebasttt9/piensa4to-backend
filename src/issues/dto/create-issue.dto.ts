import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export enum IssueType {
    COMPRA = 'compra',
    DEVOLUCION = 'devolucion',
    ERROR_LOGISTICO = 'error_logistico',
    OTRO = 'otro',
}

export enum IssueStatus {
    PENDIENTE = 'pendiente',
    RESUELTO = 'resuelto',
    CANCELADO = 'cancelado',
}

export class CreateIssueDto {
    @IsEnum(IssueType)
    @IsNotEmpty()
    type: IssueType;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsUUID()
    @IsOptional()
    inventoryItemId?: string;
}

export class UpdateIssueDto {
    @IsEnum(IssueType)
    @IsOptional()
    type?: IssueType;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsEnum(IssueStatus)
    @IsOptional()
    status?: IssueStatus;
}