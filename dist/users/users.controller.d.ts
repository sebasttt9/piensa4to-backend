import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { UserEntity } from './entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AssignOrganizationDto } from './dto/assign-organization.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(user: Omit<UserEntity, 'passwordHash'>): Omit<UserEntity, "passwordHash">;
    updateProfile(user: Omit<UserEntity, 'passwordHash'>, dto: UpdateProfileDto): Promise<Omit<UserEntity, "passwordHash">>;
    changePassword(user: Omit<UserEntity, 'passwordHash'>, dto: ChangePasswordDto): Promise<void>;
    findAll(): Promise<Omit<UserEntity, "passwordHash">[]>;
    findOne(id: string): Promise<Omit<UserEntity, "passwordHash">>;
    update(id: string, dto: UpdateUserDto): Promise<Omit<UserEntity, "passwordHash">>;
    assignOrganization(id: string, dto: AssignOrganizationDto): Promise<Omit<UserEntity, "passwordHash">>;
    removeOrganization(id: string): Promise<Omit<UserEntity, "passwordHash">>;
    removeOrganizationAlt(id: string): Promise<Omit<UserEntity, "passwordHash">>;
    approve(id: string): Promise<Omit<UserEntity, "passwordHash">>;
    remove(id: string): Promise<void>;
    resetPassword(id: string, dto: ResetPasswordDto): Promise<Omit<UserEntity, "passwordHash">>;
    create(dto: CreateUserDto): Promise<UserEntity>;
}
