import { Controller, Get } from '@nestjs/common';
import { SITE_NAME } from './common/constants';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { ok: true, name: SITE_NAME };
  }
}
