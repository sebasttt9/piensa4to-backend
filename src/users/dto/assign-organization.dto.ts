import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AssignOrganizationDto {
    @IsUUID()
    organizationId!: string;

    @IsOptional()
    @IsBoolean()
    makeAdmin?: boolean;

    @IsOptional()
    @IsBoolean()
    approve?: boolean;
}
