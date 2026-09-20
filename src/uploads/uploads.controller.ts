import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';

@Controller('uploads')
@UseGuards(AdminGuard)
export class UploadsController {
  @Post()
  @HttpCode(501)
  upload() {
    return { error: '이미지 업로드는 다음 단계에서 구현합니다.' };
  }
}
