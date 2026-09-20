import { Controller, Get, HttpCode, Post } from '@nestjs/common';

@Controller('admin')
export class AdminController {
  @Post('login')
  @HttpCode(501)
  login() {
    return { error: '관리자 로그인은 다음 단계에서 연결합니다.' };
  }

  @Get('me')
  @HttpCode(501)
  me() {
    return { error: '관리자 세션은 다음 단계에서 연결합니다.' };
  }
}
