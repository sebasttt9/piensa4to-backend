import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @IsOptional()
    @IsBoolean()
    approved?: boolean;

    @IsOptional()
    @IsUUID()
    organizationId?: string;
}
