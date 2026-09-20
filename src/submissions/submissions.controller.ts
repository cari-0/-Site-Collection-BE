import { Controller, HttpCode, Post } from '@nestjs/common';

@Controller('submissions')
export class SubmissionsController {
  @Post()
  @HttpCode(501)
  create() {
    return { error: '제보 저장은 DB 연결 후 구현합니다.' };
  }
}
