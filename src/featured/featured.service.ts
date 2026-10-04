import { Injectable } from '@nestjs/common';
import {
  HOME_REFRESH_MS,
  POPULAR_KEYWORD_LIMIT,
  RECENT_SITE_LIMIT,
  SEARCH_WINDOW_DAYS,
} from '../common/constants';
import { toSiteCard } from '../common/site-card';
import { PrismaService } from '../prisma/prisma.service';

const siteInclude = {
  category: true,
  tags: { include: { tag: true } },
} as const;

type Snapshot = {
  at: number;
  keywords: { slug: string; name: string }[];
  sites: ReturnType<typeof toSiteCard>[];
};

@Injectable()
export class FeaturedService {
  private snapshot: Snapshot | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const now = Date.now();
    if (this.snapshot && now - this.snapshot.at < HOME_REFRESH_MS) {
      return { keywords: this.snapshot.keywords, sites: this.snapshot.sites };
    }
    const [keywords, sites] = await Promise.all([this.popularKeywords(), this.recentSites()]);
    this.snapshot = { at: now, keywords, sites };
    return { keywords, sites };
  }

  private async popularKeywords() {
    const since = new Date(Date.now() - SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const [flags, counts] = await Promise.all([
      this.prisma.featuredKeyword.findMany({ include: { keyword: true } }),
      this.prisma.searchEvent.groupBy({
        by: ['keywordId'],
        where: { createdAt: { gte: since }, keywordId: { not: null } },
        _count: { keywordId: true },
      }),
    ]);

    const hidden = new Set(flags.filter((row) => row.hidden).map((row) => row.keywordId));
    const pinned = flags
      .filter((row) => row.pinned && !row.hidden)
      .sort((a, b) => a.position - b.position)
      .map((row) => ({ slug: row.keyword.slug, name: row.keyword.name, id: row.keywordId }));

    const used = new Set(pinned.map((row) => row.id));
    const ranked = counts
      .filter((row) => row.keywordId && !hidden.has(row.keywordId) && !used.has(row.keywordId))
      .sort((a, b) => b._count.keywordId - a._count.keywordId);

    const autoIds = ranked
      .map((row) => row.keywordId)
      .filter((id): id is string => Boolean(id))
      .slice(0, Math.max(0, POPULAR_KEYWORD_LIMIT - pinned.length));
    const autoRows = autoIds.length
      ? await this.prisma.keyword.findMany({ where: { id: { in: autoIds } } })
      : [];
    const autoMap = new Map(autoRows.map((row) => [row.id, row]));

    return [
      ...pinned.map((row) => ({ slug: row.slug, name: row.name })),
      ...autoIds
        .map((id) => autoMap.get(id))
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .map((row) => ({ slug: row.slug, name: row.name })),
    ].slice(0, POPULAR_KEYWORD_LIMIT);
  }

  private async recentSites() {
    const opens = await this.prisma.siteOpen.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: { site: { include: siteInclude } },
    });
    const seen = new Set<string>();
    const sites: ReturnType<typeof toSiteCard>[] = [];
    for (const open of opens) {
      const site = open.site;
      if (seen.has(site.id)) continue;
      if (site.status !== 'published' || site.language !== 'ko') continue;
      seen.add(site.id);
      sites.push(toSiteCard(site));
      if (sites.length >= RECENT_SITE_LIMIT) break;
    }
    return sites;
  }
}
