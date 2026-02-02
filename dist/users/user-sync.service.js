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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UserSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSyncService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_constants_1 = require("../database/supabase.constants");
let UserSyncService = UserSyncService_1 = class UserSyncService {
    mainSupabase;
    dataSupabase;
    logger = new common_1.Logger(UserSyncService_1.name);
    dataServiceClient;
    constructor(mainSupabase, dataSupabase) {
        this.mainSupabase = mainSupabase;
        this.dataSupabase = dataSupabase;
        this.dataServiceClient = (0, supabase_js_1.createClient)(process.env.SUPABASE_DATA_URL || 'https://nqkodrksdcmzhxoeuidj.supabase.co', process.env.SUPABASE_DATA_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa29kcmtzZGNtemh4b2V1aWRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkxMjc4MTksImV4cCI6MjA4NDcwMzgxOX0.NTQzDrNuNxqbtPzTNBoCjW3UrNTvtBl_apl9xrYcmVQ', {
            auth: {
                persistSession: false,
            },
        });
    }
    async syncUserToDataDb(user) {
        try {
            const { data: existingUser, error: checkError } = await this.dataSupabase
                .from('users')
                .select('id')
                .eq('email', user.email)
                .maybeSingle();
            if (checkError) {
                this.logger.error(`Error checking user in data DB: ${checkError.message}`);
                return;
            }
            if (existingUser) {
                this.logger.debug(`User ${user.email} already exists in data DB`);
                return;
            }
            const { error: insertError } = await this.dataServiceClient
                .from('users')
                .insert({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                created_at: user.createdAt,
                updated_at: user.updatedAt,
            });
            if (insertError) {
                if (insertError.code === '23505') {
                    const { error: retryError } = await this.dataServiceClient
                        .from('users')
                        .insert({
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        created_at: user.createdAt,
                        updated_at: user.updatedAt,
                    });
                    if (retryError) {
                        this.logger.error(`Error creating user in data DB (retry): ${retryError.message}`);
                        return;
                    }
                }
                else {
                    this.logger.error(`Error creating user in data DB: ${insertError.message}`);
                    return;
                }
            }
            this.logger.log(`User ${user.email} synced to data DB successfully`);
        }
        catch (error) {
            this.logger.error(`Unexpected error syncing user ${user.email}:`, error);
        }
    }
    async findOrCreateUserInDataDb(email) {
        try {
            const { data: existingUser, error: findError } = await this.dataSupabase
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle();
            if (findError) {
                this.logger.error(`Error finding user in data DB: ${findError.message}`);
                return null;
            }
            if (existingUser) {
                return existingUser;
            }
            const { data: mainUser, error: mainError } = await this.mainSupabase
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle();
            if (mainError || !mainUser) {
                this.logger.error(`User ${email} not found in main DB`);
                return null;
            }
            await this.syncUserToDataDb(mainUser);
            const { data: newUser, error: newFindError } = await this.dataSupabase
                .from('users')
                .select('id')
                .eq('email', email)
                .maybeSingle();
            if (newFindError || !newUser) {
                this.logger.error(`Failed to find user after sync: ${email}`);
                return null;
            }
            return newUser;
        }
        catch (error) {
            this.logger.error(`Unexpected error in findOrCreateUserInDataDb:`, error);
            return null;
        }
    }
};
exports.UserSyncService = UserSyncService;
exports.UserSyncService = UserSyncService = UserSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(supabase_constants_1.SUPABASE_CLIENT)),
    __param(1, (0, common_1.Inject)(supabase_constants_1.SUPABASE_DATA_CLIENT)),
    __metadata("design:paramtypes", [supabase_js_1.SupabaseClient,
        supabase_js_1.SupabaseClient])
], UserSyncService);
//# sourceMappingURL=user-sync.service.js.map