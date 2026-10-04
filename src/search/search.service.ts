import { Injectable } from '@nestjs/common';
import { MAX_ADS_PER_KEYWORD, PAGE_SIZE } from '../common/constants';
import { seoulToday } from '../common/date';
import { toSiteCard } from '../common/site-card';
import { slugToDisplayName, toSlug } from '../common/slug';
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
    const raw = decodeURIComponent(rawSlug).trim();
    const slug = toSlug(raw) || raw.toLowerCase();
    const name = slugToDisplayName(raw);
    const keyword = await this.prisma.keyword.findFirst({
      where: {
        OR: [
          { slug },
          { slug: { equals: raw, mode: 'insensitive' } },
          { name: { equals: raw, mode: 'insensitive' } },
          { name: { equals: name, mode: 'insensitive' } },
          { name: { equals: slug, mode: 'insensitive' } },
        ],
      },
    });
    const ads = keyword ? await this.activeAds(keyword.id) : [];
    const adIds = new Set(ads.map((item) => item.id));
    const organic = (await this.organic(slug, raw, name)).filter((site) => !adIds.has(site.id));

    return {
      name: keyword?.name ?? name,
      slug: keyword?.slug ?? slug,
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
      orderBy: [{ priority: 'asc' }, { startsOn: 'asc' }],
      take: MAX_ADS_PER_KEYWORD,
      include: { site: { include: siteInclude } },
    });
    return slots.map((slot) => slot.site);
  }

  private async organic(slug: string, raw: string, name: string) {
    const terms = [...new Set([slug, raw.trim(), name.trim()].filter(Boolean))];
    const keywordMatch = {
      OR: terms.flatMap((term) => [
        { slug: { equals: term, mode: 'insensitive' as const } },
        { name: { equals: term, mode: 'insensitive' as const } },
        { name: { contains: term, mode: 'insensitive' as const } },
      ]),
    };
    const sites = await this.prisma.site.findMany({
      where: {
        status: 'published',
        language: 'ko',
        OR: [
          { keywords: { some: { keyword: keywordMatch } } },
          ...terms.flatMap((term) => [
            { name: { contains: term, mode: 'insensitive' as const } },
            { description: { contains: term, mode: 'insensitive' as const } },
            { tags: { some: { tag: { name: { contains: term, mode: 'insensitive' as const } } } } },
          ]),
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
