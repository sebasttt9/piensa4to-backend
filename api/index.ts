import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

let serverPromise: Promise<any> | null = null;

async function getExpressServer() {
  if (!serverPromise) {
    serverPromise = (async () => {
      const app = await NestFactory.create(AppModule);
      // No llamar a listen(); sólo inicializar para serverless
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
