import { Controller, HttpCode, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { allowRequest } from '../common/rate-limit';

@Controller('ads')
export class AdsController {
  @Post('apply')
  @HttpCode(501)
  apply(@Req() request: { ip?: string }) {
    const ip = request.ip ?? 'unknown';
    if (!allowRequest(`ad:${ip}`, 3, 10 * 60 * 1000)) {
      throw new HttpException('광고 문의는 10분에 3회까지입니다.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return { error: '광고 문의 저장은 다음 단계에서 구현합니다.' };
  }
}
