import { Injectable } from '@nestjs/common';
import { MAX_ADS_PER_KEYWORD, PAGE_SIZE } from '../common/constants';
import { seoulToday } from '../common/date';
import { hashIp } from '../common/hash';
import { allowRequest } from '../common/rate-limit';
import { toSiteCard } from '../common/site-card';
import { slugToDisplayName, toSlug } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';

const siteInclude = {
  category: true,
  tags: { include: { tag: true } },
  keywords: { include: { keyword: true } },
} as const;

type OrganicSite = {
  id: string;
  slug: string;
  name: string;
  description: string;
  url: string;
  imageUrl: string | null;
  heartCount: number;
  publishedAt: Date | null;
  category: { name: string } | null;
  tags: { tag: { name: string } }[];
  keywords: { keyword: { name: string; slug: string } }[];
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async landing(rawSlug: string, ip = 'unknown') {
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
    await this.recordSearch(slug, keyword?.id, ip);
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

  private async recordSearch(slug: string, keywordId: string | undefined, ip: string) {
    if (!slug) return;
    if (!allowRequest(`search:${ip}`, 40, 10 * 60 * 1000)) return;
    await this.prisma.searchEvent.create({
      data: { slug, keywordId: keywordId ?? null, ipHash: hashIp(ip) },
    });
  }

  private async organic(slug: string, raw: string, name: string) {
    const terms = [...new Set([slug, raw.trim(), name.trim()].filter(Boolean))];
    const termLen = Math.min(...terms.map((term) => term.replace(/-/g, '').length));
    const short = termLen <= 2;
    const tiny = termLen <= 1;

    const keywordWhere = {
      OR: terms.flatMap((term) => [
        { slug: { equals: term, mode: 'insensitive' as const } },
        { name: { equals: term, mode: 'insensitive' as const } },
        ...(tiny
          ? []
          : [{ name: { startsWith: term, mode: 'insensitive' as const } }]),
        ...(short ? [] : [{ name: { contains: term, mode: 'insensitive' as const } }]),
      ]),
    };

    const sites = await this.prisma.site.findMany({
      where: {
        status: 'published',
        language: 'ko',
        OR: [
          { keywords: { some: { keyword: keywordWhere } } },
          ...(short
            ? []
            : terms.flatMap((term) => [
                { name: { contains: term, mode: 'insensitive' as const } },
                { description: { contains: term, mode: 'insensitive' as const } },
                { tags: { some: { tag: { name: { contains: term, mode: 'insensitive' as const } } } } },
              ])),
        ],
      },
      include: siteInclude,
    });

    const ranked: { site: OrganicSite; score: number }[] = [];
    for (const site of sites) {
      const score = this.score(site, terms, short, tiny);
      if (score <= 0) continue;
      ranked.push({ site, score });
    }

    return ranked
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.site.heartCount !== a.site.heartCount) return b.site.heartCount - a.site.heartCount;
        const aTime = a.site.publishedAt?.getTime() ?? 0;
        const bTime = b.site.publishedAt?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, PAGE_SIZE)
      .map((row) => row.site);
  }

  private score(site: OrganicSite, terms: string[], short: boolean, tiny: boolean) {
    const keywordHit = site.keywords.some((row) =>
      terms.some((term) => {
        if (equalsLoose(row.keyword.slug, term) || equalsLoose(row.keyword.name, term)) return true;
        if (tiny) return false;
        return (
          row.keyword.name.toLowerCase().startsWith(term.toLowerCase()) ||
          row.keyword.slug.toLowerCase().startsWith(term.toLowerCase())
        );
      }),
    );
    if (keywordHit) return 3;
    if (terms.some((term) => hasToken(site.name, term))) return 2;
    if (short) return 0;
    if (
      terms.some(
        (term) =>
          hasToken(site.description, term) ||
          site.tags.some((row) => hasToken(row.tag.name, term)),
      )
    ) {
      return 1;
    }
    return 0;
  }
}

function equalsLoose(value: string, term: string) {
  return value.toLowerCase() === term.toLowerCase();
}

function hasToken(text: string, term: string) {
  const needle = term.replace(/-/g, '').toLowerCase();
  if (!needle) return false;
  const parts = text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return parts.some((part) => part.replace(/-/g, '').toLowerCase() === needle);
}
