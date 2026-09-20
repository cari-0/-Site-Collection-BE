import { Controller, HttpCode, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { allowRequest } from '../common/rate-limit';

@Controller('submissions')
export class SubmissionsController {
  @Post()
  @HttpCode(501)
  create(@Req() request: { ip?: string }) {
    const ip = request.ip ?? 'unknown';
    if (!allowRequest(`submit:${ip}`, 5, 10 * 60 * 1000)) {
      throw new HttpException('제보는 10분에 5회까지입니다.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return { error: '제보 저장은 다음 단계에서 구현합니다.' };
  }
}
