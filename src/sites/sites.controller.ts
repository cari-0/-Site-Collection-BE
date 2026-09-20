import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

@Controller('sites')
export class SitesController {
  @Get(':slug')
  detail(@Param('slug') _slug: string) {
    throw new NotFoundException('사이트는 DB 연결 후 조회합니다.');
  }
}
