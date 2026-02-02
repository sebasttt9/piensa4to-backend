import { ConfigService } from '@nestjs/config';
export declare class OpenAiService {
    private readonly configService;
    private readonly client;
    private readonly logger;
    constructor(configService: ConfigService);
    generateText(systemPrompt: string, userMessage: string, model?: string): Promise<string | null>;
}
