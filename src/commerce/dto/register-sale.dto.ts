import { IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class RegisterSaleDto {
    @IsUUID('4')
    itemId!: string;

    @IsInt()
    @Min(1)
    quantity!: number;

    @IsNumber()
    @Min(0)
    unitPrice!: number;

    @IsString()
    @MaxLength(16)
    currencyCode!: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    customerLabel?: string;
}
