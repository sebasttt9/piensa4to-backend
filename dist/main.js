"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        app.enableCors({ origin: true, credentials: true });
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }));
        app.setGlobalPrefix('api');
        const port = process.env.PORT ?? 3000;
        await app.listen(port);
        console.log(`Application is running on: http://localhost:${port}`);
    }
    catch (error) {
        console.error('Failed to start application:', error);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map