"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OpenAiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = __importDefault(require("openai"));
let OpenAiService = OpenAiService_1 = class OpenAiService {
    configService;
    client;
    logger = new common_1.Logger(OpenAiService_1.name);
    constructor(configService) {
        this.configService = configService;
        const apiKey = this.configService.get('OPENAI_API_KEY');
        if (!apiKey) {
            this.logger.warn('OpenAI API key is not configured. AI features will return fallback content.');
            this.client = null;
            return;
        }
        this.client = new openai_1.default({ apiKey });
    }
    async generateText(systemPrompt, userMessage, model = 'gpt-4.1-mini') {
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
        }
        catch (error) {
            this.logger.error('Failed to generate OpenAI response', error instanceof Error ? error.stack : undefined);
            return null;
        }
    }
};
exports.OpenAiService = OpenAiService;
exports.OpenAiService = OpenAiService = OpenAiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OpenAiService);
//# sourceMappingURL=openai.service.js.map