import { Injectable, NotFoundException } from '@nestjs/common';
import { toSiteCard } from '../common/site-card';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async detail(rawSlug: string) {
    const slug = decodeURIComponent(rawSlug).trim();
    const site = await this.prisma.site.findFirst({
      where: { slug, status: 'published', language: 'ko' },
      include: {
        category: true,
        tags: { include: { tag: true } },
        keywords: { include: { keyword: true } },
      },
    });
    if (!site) throw new NotFoundException('사이트를 찾을 수 없습니다.');

    const related = await this.prisma.site.findMany({
      where: {
        status: 'published',
        language: 'ko',
        categoryId: site.categoryId,
        id: { not: site.id },
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      include: {
        category: true,
        tags: { include: { tag: true } },
      },
    });

    return {
      ...toSiteCard(site),
      features: site.features
        ? site.features.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
        : [],
      keywords: site.keywords.map((row) => row.keyword.name),
      related: related.map((item) => toSiteCard(item)),
    };
  }
}
