import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserEntity } from '../users/entities/user.entity';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { ShareDashboardDto } from './dto/share-dashboard.dto';
import { ApproveDashboardDto } from './dto/approve-dashboard.dto';
import type { Response } from 'express';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles.enum';

@Controller('dashboards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) { }

  private validateOrganization(organizationId?: string): string {
    // Fallback para entornos donde aún no se asigna organizationId al usuario
    return organizationId ?? 'default-org';
  }

  @Post()
  @Roles(UserRole.User, UserRole.Admin)
  create(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>, @Body() dto: CreateDashboardDto) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.dashboardsService.create(user.id, dto, user.role, organizationId);
  }

  @Get()
  @Roles(UserRole.User, UserRole.Admin)
  async findAll(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 10;
    const skip = (parsedPage - 1) * parsedLimit;
    const [dashboards, total] = await Promise.all([
      this.dashboardsService.findAll(user.id, user.role, skip, parsedLimit, organizationId),
      this.dashboardsService.countByUser(user.id, user.role, organizationId),
    ]);
    return {
      data: dashboards,
      total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @Roles(UserRole.User, UserRole.Admin)
  findOne(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>, @Param('id') id: string) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.dashboardsService.findOne(user.id, id, user.role, organizationId);
  }

  @Put(':id')
  @Roles(UserRole.User, UserRole.Admin)
  update(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Param('id') id: string,
    @Body() dto: UpdateDashboardDto,
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.dashboardsService.update(user.id, id, dto, user.role, organizationId);
  }

  @Patch(':id/share')
  @Roles(UserRole.User, UserRole.Admin)
  share(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Param('id') id: string,
    @Body() dto: { isPublic: boolean },
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.dashboardsService.share(user.id, id, dto.isPublic, user.role, organizationId);
  }

  @Post(':id/share/invite')
  @Roles(UserRole.User, UserRole.Admin)
  shareWithContact(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Param('id') id: string,
    @Body() dto: ShareDashboardDto,
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.dashboardsService.shareWithContact(user.id, id, dto, user.role, organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.User, UserRole.Admin)
  remove(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>, @Param('id') id: string) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.dashboardsService.remove(user.id, id, user.role, organizationId);
  }

  @Get(':id/export')
  @Roles(UserRole.User, UserRole.Admin)
  async export(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Param('id') id: string,
    @Query('format') format = 'json',
    @Res() res: Response,
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    const normalizedFormat = format === 'pdf' ? 'pdf' : 'json';
    if (normalizedFormat === 'json') {
      const dashboard = await this.dashboardsService.export(user.id, id, 'json', user.role, organizationId);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-${id}.json"`);
      return res.send(JSON.stringify(dashboard, null, 2));
    }

    const pdfBuffer = await this.dashboardsService.export(user.id, id, 'pdf', user.role, organizationId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dashboard-${id}.pdf"`);
    return res.send(pdfBuffer);
  }

  @Patch(':id/approve')
  @Roles(UserRole.Admin)
  approve(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>, @Param('id') id: string, @Body() dto: ApproveDashboardDto) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.dashboardsService.approveDashboard(user.id, id, dto.status, user.role, organizationId);
  }
}
