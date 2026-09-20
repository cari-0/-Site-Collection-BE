import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { allowRequest } from '../common/rate-limit';
import { PrismaService } from '../prisma/prisma.service';

export type AdminToken = { sub: string; email: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const normalized = email.trim().toLowerCase();
    if (!allowRequest(`login:${normalized}`, 10, 10 * 60 * 1000)) {
      throw new HttpException('잠시 후 다시 시도하세요.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { email: normalized },
    });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const secret = this.config.getOrThrow<string>('AUTH_SECRET');
    const token = jwt.sign(
      { sub: admin.id, email: admin.email } satisfies AdminToken,
      secret,
      { expiresIn: '7d' },
    );
    return { token, email: admin.email };
  }

  verify(token: string): AdminToken {
    const secret = this.config.getOrThrow<string>('AUTH_SECRET');
    const payload = jwt.verify(token, secret);
    if (typeof payload === 'string' || !payload.sub || !payload.email) {
      throw new UnauthorizedException();
    }
    return { sub: String(payload.sub), email: String(payload.email) };
  }
}
