import { UserRole } from '../../common/constants/roles.enum';
export interface UserEntity {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    passwordHash?: string;
    approved: boolean;
    organizationId?: string;
    createdAt: string;
    updatedAt: string;
}
