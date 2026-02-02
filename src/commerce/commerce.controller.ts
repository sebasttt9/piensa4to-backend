import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles.enum';
import type { UserEntity } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CommerceService, type CommerceOverview } from './commerce.service';
import { RegisterSaleDto } from './dto/register-sale.dto';

@Controller('commerce')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommerceController {
    constructor(private readonly commerceService: CommerceService) {}

    @Get('overview')
    @Roles(UserRole.User, UserRole.Admin)
    getOverview(
        @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
    ): Promise<CommerceOverview> {
        return this.commerceService.getOverview(user.id, user.organizationId);
    }

    @Post('sales')
    @Roles(UserRole.User, UserRole.Admin)
    registerSale(
        @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
        @Body() dto: RegisterSaleDto,
    ) {
        return this.commerceService.registerSale(user.id, user.organizationId, dto);
    }
}

