import { Injectable, NotFoundException } from '@nestjs/common';
import { allowRequest } from '../common/rate-limit';
import { hashIp } from '../common/hash';
import { PrismaService } from '../prisma/prisma.service';

const VISITOR_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class OpensService {
  constructor(private readonly prisma: PrismaService) {}

  async record(rawSlug: string, visitorKey: string | undefined, ip: string) {
    if (!allowRequest(`open:${ip}`, 40, 10 * 60 * 1000)) return { ok: true };
    const slug = decodeURIComponent(rawSlug).trim();
    const site = await this.prisma.site.findFirst({
      where: { slug, status: 'published', language: 'ko' },
      select: { id: true },
    });
    if (!site) throw new NotFoundException('사이트를 찾을 수 없습니다.');

    const key = visitorKey && VISITOR_KEY.test(visitorKey) ? visitorKey : null;
    if (key) {
      const recent = await this.prisma.siteOpen.findFirst({
        where: {
          siteId: site.id,
          visitorKey: key,
          createdAt: { gte: new Date(Date.now() - 60_000) },
        },
        select: { id: true },
      });
      if (recent) return { ok: true };
    }

    await this.prisma.siteOpen.create({
      data: { siteId: site.id, visitorKey: key, ipHash: hashIp(ip) },
    });
    return { ok: true };
  }
}
