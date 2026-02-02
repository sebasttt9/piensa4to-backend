import { IsEmail, IsEnum, IsOptional, IsString, MinLength, IsUUID } from 'class-validator';
import { UserRole } from '../../common/constants/roles.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.User;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
