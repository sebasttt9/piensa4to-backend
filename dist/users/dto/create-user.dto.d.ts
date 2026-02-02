import { UserRole } from '../../common/constants/roles.enum';
export declare class CreateUserDto {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
    organizationId?: string;
}
