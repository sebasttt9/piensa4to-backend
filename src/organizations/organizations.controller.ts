import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles.enum';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Post()
    @Roles(UserRole.SuperAdmin)
    create(@Body() createOrganizationDto: CreateOrganizationDto) {
        return this.organizationsService.create(createOrganizationDto);
    }

    @Get()
    @Roles(UserRole.Admin, UserRole.SuperAdmin)
    findAll() {
        return this.organizationsService.findAll();
    }

    @Get(':id')
    @Roles(UserRole.Admin, UserRole.SuperAdmin)
    findOne(@Param('id') id: string) {
        return this.organizationsService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.SuperAdmin)
    update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
        return this.organizationsService.update(id, updateOrganizationDto);
    }

    @Delete(':id')
    @Roles(UserRole.SuperAdmin)
    remove(@Param('id') id: string) {
        return this.organizationsService.remove(id);
    }
}