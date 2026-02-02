import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DatasetsService } from './datasets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserEntity } from '../users/entities/user.entity';
import { UploadDatasetDto } from './dto/upload-dataset.dto';
import { CreateManualDatasetDto } from './dto/create-manual-dataset.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles.enum';

@Controller('datasets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DatasetsController {
  constructor(
    private readonly datasetsService: DatasetsService,
  ) { }

  private validateOrganization(organizationId?: string): string {
    // Fallback para entornos donde aún no se asigna organizationId al usuario
    return organizationId ?? 'default-org';
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
    const [datasets, total] = await Promise.all([
      this.datasetsService.findAll(user.id, user.role, skip, parsedLimit, organizationId),
      this.datasetsService.countByUser(user.id, user.role, organizationId),
    ]);
    return {
      data: datasets,
      total,
      page: parsedPage,
      limit: parsedLimit,
    };
  }

  @Get(':id')
  @Roles(UserRole.User, UserRole.Admin)
  findOne(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>, @Param('id') id: string) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.datasetsService.findOne(user.id, id, user.role, organizationId);
  }

  @Post()
  @Roles(UserRole.Admin, UserRole.User)
  create(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Body() dto: UploadDatasetDto,
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.datasetsService.create(user.id, dto, organizationId);
  }

  @Post('manual')
  @Roles(UserRole.Admin, UserRole.User)
  createManual(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Body() dto: CreateManualDatasetDto,
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.datasetsService.createManual(user.id, dto, organizationId);
  }

  @Put(':id')
  @Roles(UserRole.Admin)
  update(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Param('id') id: string,
    @Body() dto: Partial<UploadDatasetDto>,
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.datasetsService.update(user.id, id, dto, user.role, organizationId);
  }

  @Post(':id/upload')
  @Roles(UserRole.Admin, UserRole.User)
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.datasetsService.uploadDataset(user.id, id, file, user.role, organizationId);
  }

  @Get(':id/preview')
  @Roles(UserRole.User, UserRole.Admin)
  async getPreview(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Param('id') id: string,
    @Query('limit') limit = 50,
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    const dataset = await this.datasetsService.findOne(user.id, id, user.role, organizationId);
    const preview = await this.datasetsService.getPreview(id, Number(limit));
    const columns = preview.length > 0 ? Object.keys(preview[0]) : [];
    return {
      data: preview,
      columns,
      total: dataset.rowCount || 0,
    };
  }

  @Get(':id/analyze')
  @Roles(UserRole.User, UserRole.Admin)
  analyzeDataset(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Param('id') id: string,
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    // TODO: Implement analysis
    return { datasetId: id, message: 'Analysis coming soon' };
  }

  @Get(':id/insights')
  @Roles(UserRole.User, UserRole.Admin)
  getInsights(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Param('id') id: string,
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    // TODO: Implement insights
    return { datasetId: id, message: 'Insights coming soon' };
  }

  @Get(':id/report')
  @Roles(UserRole.User, UserRole.Admin)
  async generateReport(
    @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    @Param('id') id: string,
    @Query('format') format: 'json' | 'pdf' = 'json',
  ) {
    const organizationId = this.validateOrganization(user.organizationId);
    // Validate dataset ownership
    await this.datasetsService.findOne(user.id, id, user.role, organizationId);

    if (format === 'json') {
      return { datasetId: id, message: 'JSON report coming soon' };
    }

    // PDF generation can be implemented with libraries like PDFKit or puppeteer
    throw new BadRequestException('PDF export coming soon');
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  remove(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>, @Param('id') id: string) {
    const organizationId = this.validateOrganization(user.organizationId);
    return this.datasetsService.remove(user.id, id, user.role, organizationId);
  }
}
