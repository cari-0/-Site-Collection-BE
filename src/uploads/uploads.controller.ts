import { Controller, HttpCode, Post } from '@nestjs/common';

@Controller('uploads')
export class UploadsController {
  @Post()
  @HttpCode(501)
  upload() {
    return { error: '이미지 업로드는 관리자 세션 연결 후 구현합니다.' };
  }
}
