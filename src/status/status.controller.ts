import { Controller, Get } from '@nestjs/common';

@Controller('status')
export class StatusController {
  @Get()
  getStatus() {
    return {
      ok: true,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ping')
  ping() {
    return { message: 'pong', timestamp: new Date().toISOString() };
  }

  @Get('version')
  version() {
    return { version: process.env.npm_package_version || 'unknown' };
  }
}
