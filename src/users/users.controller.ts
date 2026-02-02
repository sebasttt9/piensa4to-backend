import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserEntity } from './entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AssignOrganizationDto } from './dto/assign-organization.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  getProfile(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>) {
    return user;
  }

  @Put('me')
  updateProfile(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('change-password')
  changePassword(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Get()
  @Roles(UserRole.SuperAdmin)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SuperAdmin)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.SuperAdmin)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/organization')
  @Roles(UserRole.SuperAdmin)
  assignOrganization(@Param('id') id: string, @Body() dto: AssignOrganizationDto) {
    return this.usersService.assignOrganization(id, dto);
  }

  @Delete(':id/organization')
  @Roles(UserRole.SuperAdmin)
  removeOrganization(@Param('id') id: string) {
    return this.usersService.removeOrganization(id);
  }

  // Ruta alternativa por si algún proxy bloquea DELETE
  @Patch(':id/organization/remove')
  @Roles(UserRole.SuperAdmin)
  removeOrganizationAlt(@Param('id') id: string) {
    return this.usersService.removeOrganization(id);
  }

  @Patch(':id/approve')
  @Roles(UserRole.SuperAdmin)
  approve(@Param('id') id: string) {
    return this.usersService.update(id, { approved: true });
  }

  @Delete(':id')
  @Roles(UserRole.SuperAdmin)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/reset-password')
  @Roles(UserRole.SuperAdmin)
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.update(id, { password: dto.password });
  }

  @Post()
  @Roles(UserRole.SuperAdmin)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
}
