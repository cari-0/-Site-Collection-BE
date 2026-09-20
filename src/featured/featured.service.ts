import { Injectable } from '@nestjs/common';
import { toSiteCard } from '../common/site-card';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeaturedService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const [keywords, sites] = await Promise.all([
      this.prisma.featuredKeyword.findMany({
        orderBy: { position: 'asc' },
        include: { keyword: true },
      }),
      this.prisma.featuredSite.findMany({
        orderBy: { position: 'asc' },
        include: {
          site: {
            include: {
              category: true,
              tags: { include: { tag: true } },
            },
          },
        },
      }),
    ]);

    return {
      keywords: keywords.map((row) => ({
        slug: row.keyword.slug,
        name: row.keyword.name,
      })),
      sites: sites
        .filter((row) => row.site.status === 'published' && row.site.language === 'ko')
        .map((row) => toSiteCard(row.site)),
    };
  }
}
