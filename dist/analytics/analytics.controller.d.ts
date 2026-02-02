import { AnalyticsService } from './analytics.service';
import type { AiChatPayload, OverviewAnalytics } from './analytics.service';
import type { UserEntity } from '../users/entities/user.entity';
import { AiChatRequestDto } from './dto/ai-chat-request.dto';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getOverview(user: Omit<UserEntity, 'passwordHash'>): Promise<OverviewAnalytics>;
    generateAiChat(user: Omit<UserEntity, 'passwordHash'>, input: AiChatRequestDto): Promise<AiChatPayload>;
}
