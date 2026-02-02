import { Module } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import { EmailService } from './services/email.service';
import { CacheService } from './services/cache.service';
import { OpenAiService } from './services/openai.service';
import { ActiveUsersService } from './services/active-users.service';

@Module({
    providers: [StorageService, EmailService, CacheService, OpenAiService, ActiveUsersService],
    exports: [StorageService, EmailService, CacheService, OpenAiService, ActiveUsersService],
})
export class SharedModule { }
