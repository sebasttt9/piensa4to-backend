import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { UserEntity } from '../users/entities/user.entity';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        user: Record<string, unknown>;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: Record<string, unknown>;
    }>;
    me(user: Omit<UserEntity, 'passwordHash'>): Omit<UserEntity, "passwordHash">;
}
