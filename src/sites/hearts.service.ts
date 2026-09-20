import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { allowRequest } from '../common/rate-limit';
import { PrismaService } from '../prisma/prisma.service';

const VISITOR_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class HeartsService {
  constructor(private readonly prisma: PrismaService) {}

  async like(rawSlug: string, visitorKey: string, ip: string) {
    if (!VISITOR_KEY.test(visitorKey)) {
      throw new HttpException('방문자 키가 올바르지 않습니다.', HttpStatus.BAD_REQUEST);
    }
    if (!allowRequest(`heart:${ip}`, 30, 10 * 60 * 1000)) {
      throw new HttpException('하트는 잠시 후 다시 시도하세요.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const slug = decodeURIComponent(rawSlug).trim();
    const site = await this.prisma.site.findFirst({
      where: { slug, status: 'published', language: 'ko' },
    });
    if (!site) throw new NotFoundException('사이트를 찾을 수 없습니다.');

    const already = await this.prisma.siteHeart.findUnique({
      where: { siteId_visitorKey: { siteId: site.id, visitorKey } },
    });
    if (already) {
      await this.prisma.$transaction([
        this.prisma.siteHeart.delete({ where: { id: already.id } }),
        this.prisma.site.update({
          where: { id: site.id },
          data: { heartCount: Math.max(0, site.heartCount - 1) },
        }),
      ]);
      return { heartCount: Math.max(0, site.heartCount - 1), liked: false };
    }

    await this.prisma.$transaction([
      this.prisma.siteHeart.create({ data: { siteId: site.id, visitorKey } }),
      this.prisma.site.update({
        where: { id: site.id },
        data: { heartCount: { increment: 1 } },
      }),
    ]);

    return { heartCount: site.heartCount + 1, liked: true };
  }

  async status(rawSlug: string, visitorKey?: string) {
    const slug = decodeURIComponent(rawSlug).trim();
    const site = await this.prisma.site.findFirst({
      where: { slug, status: 'published', language: 'ko' },
      select: { id: true, heartCount: true },
    });
    if (!site) throw new NotFoundException('사이트를 찾을 수 없습니다.');

    let liked = false;
    if (visitorKey && VISITOR_KEY.test(visitorKey)) {
      const row = await this.prisma.siteHeart.findUnique({
        where: { siteId_visitorKey: { siteId: site.id, visitorKey } },
      });
      liked = Boolean(row);
    }
    return { heartCount: site.heartCount, liked };
  }
}
