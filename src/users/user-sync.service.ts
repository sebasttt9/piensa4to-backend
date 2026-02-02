import { Injectable, Inject, Logger } from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT, SUPABASE_DATA_CLIENT } from '../database/supabase.constants';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class UserSyncService {
    private readonly logger = new Logger(UserSyncService.name);
    private dataServiceClient: SupabaseClient;

    constructor(
        @Inject(SUPABASE_CLIENT)
        private readonly mainSupabase: SupabaseClient,
        @Inject(SUPABASE_DATA_CLIENT)
        private readonly dataSupabase: SupabaseClient,
    ) {
        // Crear un cliente de servicio que bypass RLS
        this.dataServiceClient = createClient(
            process.env.SUPABASE_DATA_URL || 'https://nqkodrksdcmzhxoeuidj.supabase.co',
            process.env.SUPABASE_DATA_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xa29kcmtzZGNtemh4b2V1aWRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkxMjc4MTksImV4cCI6MjA4NDcwMzgxOX0.NTQzDrNuNxqbtPzTNBoCjW3UrNTvtBl_apl9xrYcmVQ',
            {
                auth: {
                    persistSession: false,
                },
            }
        );
    }

    /**
     * Sincroniza un usuario desde la base de datos principal a la de datos
     */
    async syncUserToDataDb(user: UserEntity): Promise<void> {
        try {
            // Verificar si el usuario ya existe en la base de datos de datos
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
                // Usuario ya existe, actualizar si es necesario
                this.logger.debug(`User ${user.email} already exists in data DB`);
                return;
            }

            // Crear usuario en la base de datos de datos
            const { error: insertError } = await this.dataServiceClient
                .from('users')
                .insert({
                    id: user.id, // Intentar usar el mismo ID
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    created_at: user.createdAt,
                    updated_at: user.updatedAt,
                });

            if (insertError) {
                // Si falla por ID duplicado, intentar sin ID (dejará que la DB genere uno)
                if (insertError.code === '23505') { // unique_violation
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
                } else {
                    this.logger.error(`Error creating user in data DB: ${insertError.message}`);
                    return;
                }
            }

            this.logger.log(`User ${user.email} synced to data DB successfully`);
        } catch (error) {
            this.logger.error(`Unexpected error syncing user ${user.email}:`, error);
        }
    }

    /**
     * Encuentra o crea un usuario en la base de datos de datos
     */
    async findOrCreateUserInDataDb(email: string): Promise<{ id: string } | null> {
        try {
            // Buscar usuario existente
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

            // Si no existe, buscar en la DB principal y sincronizar
            const { data: mainUser, error: mainError } = await this.mainSupabase
                .from('users')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (mainError || !mainUser) {
                this.logger.error(`User ${email} not found in main DB`);
                return null;
            }

            // Sincronizar usuario
            await this.syncUserToDataDb(mainUser as UserEntity);

            // Buscar nuevamente
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
        } catch (error) {
            this.logger.error(`Unexpected error in findOrCreateUserInDataDb:`, error);
            return null;
        }
    }
}