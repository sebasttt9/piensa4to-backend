import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT, SUPABASE_DATA_CLIENT } from './supabase.constants';

const warnIfProjectIdMismatch = (url: string, expectedId: string, label: string): void => {
    const host = new URL(url).hostname;
    if (!host.startsWith(`${expectedId}.`)) {
        console.warn(`[Supabase] ${label}: la URL ${host} no coincide con projectId esperado ${expectedId}. Revisa tus variables de entorno.`);
    }
};

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: SUPABASE_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService): SupabaseClient => {
                const url = configService.get<string>('supabase.url');
                const serviceRoleKey = configService.get<string>('supabase.serviceRoleKey');
                const projectId = configService.get<string>('supabase.projectId');

                if (!url || !serviceRoleKey) {
                    throw new Error('Primary Supabase credentials are not configured');
                }

                if (projectId) {
                    warnIfProjectIdMismatch(url, projectId, 'Base de usuarios');
                }

                return createClient(url, serviceRoleKey, {
                    auth: {
                        persistSession: false,
                    },
                });
            },
        },
        {
            provide: SUPABASE_DATA_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService): SupabaseClient => {
                const dataUrl = configService.get<string>('supabase.datasets.url');
                const dataServiceRoleKey = configService.get<string>('supabase.datasets.serviceRoleKey');
                const dataProjectId = configService.get<string>('supabase.datasets.projectId');

                if (!dataUrl || !dataServiceRoleKey) {
                    throw new Error('Datasets Supabase credentials are not configured');
                }

                if (dataProjectId) {
                    warnIfProjectIdMismatch(dataUrl, dataProjectId, 'Base de datos');
                }

                return createClient(dataUrl, dataServiceRoleKey, {
                    auth: {
                        persistSession: false,
                    },
                });
            },
        },
    ],
    exports: [SUPABASE_CLIENT, SUPABASE_DATA_CLIENT],
})
export class SupabaseModule { }
