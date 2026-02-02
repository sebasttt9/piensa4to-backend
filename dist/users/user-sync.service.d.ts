import { SupabaseClient } from '@supabase/supabase-js';
import { UserEntity } from '../users/entities/user.entity';
export declare class UserSyncService {
    private readonly mainSupabase;
    private readonly dataSupabase;
    private readonly logger;
    private dataServiceClient;
    constructor(mainSupabase: SupabaseClient, dataSupabase: SupabaseClient);
    syncUserToDataDb(user: UserEntity): Promise<void>;
    findOrCreateUserInDataDb(email: string): Promise<{
        id: string;
    } | null>;
}
