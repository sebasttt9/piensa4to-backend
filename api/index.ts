import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

let serverPromise: Promise<any> | null = null;

async function getExpressServer() {
    if (!serverPromise) {
        serverPromise = (async () => {
            const app = await NestFactory.create(AppModule);
            // Replicar configuración de main.ts
            app.enableCors({ origin: true, credentials: true });
            app.useGlobalPipes(
                new ValidationPipe({
                    whitelist: true,
                    transform: true,
                    transformOptions: { enableImplicitConversion: true },
                }),
            );
            app.setGlobalPrefix('api');
            // Inicializar sin listen() para serverless
            await app.init();
            // Obtener la instancia de Express para manejar req/res directamente
            const expressApp = app.getHttpAdapter().getInstance();
            return expressApp;
        })();
    }
    return serverPromise;
}

export default async function handler(req: any, res: any) {
    const server = await getExpressServer();
    return server(req, res);
}
