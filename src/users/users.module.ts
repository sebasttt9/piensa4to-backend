import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesGuard } from '../common/guards/roles.guard';
import { SupabaseModule } from '../database/supabase.module';
import { UserSyncService } from './user-sync.service';

@Module({
  imports: [SupabaseModule],
  controllers: [UsersController],
  providers: [UsersService, RolesGuard, UserSyncService],
  exports: [UsersService, UserSyncService],
})
export class UsersModule { }
