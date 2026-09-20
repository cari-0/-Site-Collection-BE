import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

@Controller('admin')
export class AdminController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me(@Req() request: { admin: { id: string; email: string } }) {
    return request.admin;
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  async stats() {
    const [published, pendingSubmissions, pendingAds] = await Promise.all([
      this.prisma.site.count({ where: { status: 'published', language: 'ko' } }),
      this.prisma.submission.count({ where: { status: 'pending' } }),
      this.prisma.adRequest.count({ where: { status: 'pending' } }),
    ]);
    return { published, pendingSubmissions, pendingAds };
  }

  @Get('categories')
  @UseGuards(AdminGuard)
  categories() {
    return this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  }
}
