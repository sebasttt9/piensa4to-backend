import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
    private readonly client: OpenAI | null;
    private readonly logger = new Logger(OpenAiService.name);

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');

        if (!apiKey) {
            this.logger.warn('OpenAI API key is not configured. AI features will return fallback content.');
            this.client = null;
            return;
        }

        this.client = new OpenAI({ apiKey });
    }

    async generateText(systemPrompt: string, userMessage: string, model = 'gpt-4.1-mini'): Promise<string | null> {
        if (!this.client) {
            return null;
        }

        try {
            const response = await this.client.responses.create({
                model,
                input: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
            });

            return (response.output_text ?? '').trim() || null;
        } catch (error) {
            this.logger.error('Failed to generate OpenAI response', error instanceof Error ? error.stack : undefined);
            return null;
        }
    }
}
