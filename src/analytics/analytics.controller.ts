import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type { AiChatPayload, OverviewAnalytics } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserEntity } from '../users/entities/user.entity';
import { AiChatRequestDto } from './dto/ai-chat-request.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/constants/roles.enum';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('overview')
    @Roles(UserRole.User, UserRole.Admin)
    getOverview(@CurrentUser() user: Omit<UserEntity, 'passwordHash'>): Promise<OverviewAnalytics> {
        return this.analyticsService.getOverview(user.id);
    }

    @Post('insights/chat')
    @Roles(UserRole.User, UserRole.Admin)
    generateAiChat(
        @CurrentUser() user: Omit<UserEntity, 'passwordHash'>,
        @Body() input: AiChatRequestDto,
    ): Promise<AiChatPayload> {
        return this.analyticsService.generateAiInsightsChat(user.id, input);
    }
}
