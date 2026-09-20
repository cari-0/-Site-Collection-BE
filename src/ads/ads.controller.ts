import { Controller, HttpCode, Post } from '@nestjs/common';

@Controller('ads')
export class AdsController {
  @Post('apply')
  @HttpCode(501)
  apply() {
    return { error: '광고 문의 저장은 DB 연결 후 구현합니다.' };
  }
}
