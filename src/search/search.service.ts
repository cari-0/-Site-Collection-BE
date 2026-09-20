import { Injectable } from '@nestjs/common';
import { MAX_ADS_PER_KEYWORD, PAGE_SIZE } from '../common/constants';
import { seoulToday } from '../common/date';
import { toSiteCard } from '../common/site-card';
import { slugToDisplayName } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';

const siteInclude = {
  category: true,
  tags: { include: { tag: true } },
  keywords: { include: { keyword: true } },
} as const;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async landing(rawSlug: string) {
    const slug = decodeURIComponent(rawSlug).trim();
    const name = slugToDisplayName(slug);
    const keyword = await this.prisma.keyword.findUnique({ where: { slug } });
    const ads = keyword ? await this.activeAds(keyword.id) : [];
    const adIds = new Set(ads.map((item) => item.id));
    const organic = (await this.organic(slug, name)).filter((site) => !adIds.has(site.id));

    return {
      name: keyword?.name ?? name,
      slug,
      ads: ads.map((site) => toSiteCard(site)),
      sites: organic.map((site) => toSiteCard(site)),
      total: organic.length,
      pageSize: PAGE_SIZE,
      maxAds: MAX_ADS_PER_KEYWORD,
    };
  }

  private async activeAds(keywordId: string) {
    const today = seoulToday();
    const slots = await this.prisma.adSlot.findMany({
      where: {
        keywordId,
        startsOn: { lte: today },
        endsOn: { gte: today },
        site: { status: 'published', language: 'ko' },
      },
      orderBy: { priority: 'asc' },
      take: MAX_ADS_PER_KEYWORD,
      include: { site: { include: siteInclude } },
    });
    return slots.map((slot) => slot.site);
  }

  private async organic(slug: string, name: string) {
    const q = name.trim();
    const sites = await this.prisma.site.findMany({
      where: {
        status: 'published',
        language: 'ko',
        OR: [
          { keywords: { some: { keyword: { slug } } } },
          { keywords: { some: { keyword: { name: { equals: q, mode: 'insensitive' } } } } },
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
        ],
      },
      include: siteInclude,
    });

    return sites
      .sort((a, b) => {
        if (b.heartCount !== a.heartCount) return b.heartCount - a.heartCount;
        const aTime = a.publishedAt?.getTime() ?? 0;
        const bTime = b.publishedAt?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, PAGE_SIZE);
  }
}
