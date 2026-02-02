import { UserRole } from '../../common/constants/roles.enum';
export interface JwtPayload {
    sub: string;
    email: string;
    role: UserRole;
}
