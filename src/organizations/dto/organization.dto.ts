import { IsNotEmpty, IsOptional, IsString, IsEmail } from 'class-validator';

export class CreateOrganizationDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    owner?: string;

    @IsString()
    @IsOptional()
    ciRuc?: string;

    @IsEmail()
    @IsOptional()
    businessEmail?: string;
}

export class UpdateOrganizationDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsString()
    @IsOptional()
    owner?: string;

    @IsString()
    @IsOptional()
    ciRuc?: string;

    @IsEmail()
    @IsOptional()
    businessEmail?: string;
}