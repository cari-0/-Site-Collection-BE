import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { toSlug } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';

const MAX_FEATURED_SITES = 6;

@Injectable()
export class AdminFeaturedService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const [keywords, sites] = await Promise.all([
      this.prisma.featuredKeyword.findMany({
        orderBy: { position: 'asc' },
        include: { keyword: true },
      }),
      this.prisma.featuredSite.findMany({
        orderBy: { position: 'asc' },
        include: { site: { select: { id: true, name: true, slug: true, status: true } } },
      }),
    ]);
    return {
      keywords: keywords.map((row) => ({
        id: row.id,
        keywordId: row.keywordId,
        name: row.keyword.name,
        slug: row.keyword.slug,
        position: row.position,
      })),
      sites: sites.map((row) => ({
        id: row.id,
        siteId: row.siteId,
        name: row.site.name,
        slug: row.site.slug,
        position: row.position,
      })),
    };
  }

  async addKeyword(name: string) {
    const trimmed = name.trim();
    const slug = toSlug(trimmed);
    if (!slug) throw new BadRequestException('키워드를 입력하세요.');

    const keyword = await this.prisma.keyword.upsert({
      where: { slug },
      update: {},
      create: { name: trimmed, slug },
    });
    const exists = await this.prisma.featuredKeyword.findUnique({
      where: { keywordId: keyword.id },
    });
    if (exists) throw new ConflictException('이미 인기 검색어에 있습니다.');

    const last = await this.prisma.featuredKeyword.aggregate({ _max: { position: true } });
    return this.prisma.featuredKeyword.create({
      data: { keywordId: keyword.id, position: (last._max.position ?? 0) + 1 },
    });
  }

  async removeKeyword(id: string) {
    await this.requireKeyword(id);
    await this.prisma.featuredKeyword.delete({ where: { id } });
    await this.repackKeywords();
    return { ok: true };
  }

  async moveKeyword(id: string, direction: 'up' | 'down') {
    return this.move('featuredKeyword', id, direction);
  }

  async addSite(siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('사이트를 찾을 수 없습니다.');
    if (site.status !== 'published' || site.language !== 'ko') {
      throw new BadRequestException('공개된 한국 사이트만 추천할 수 있습니다.');
    }
    const count = await this.prisma.featuredSite.count();
    if (count >= MAX_FEATURED_SITES) {
      throw new BadRequestException(`추천 사이트는 ${MAX_FEATURED_SITES}개까지입니다.`);
    }
    const exists = await this.prisma.featuredSite.findUnique({ where: { siteId } });
    if (exists) throw new ConflictException('이미 추천에 있습니다.');

    const last = await this.prisma.featuredSite.aggregate({ _max: { position: true } });
    return this.prisma.featuredSite.create({
      data: { siteId, position: (last._max.position ?? 0) + 1 },
    });
  }

  async removeSite(id: string) {
    await this.requireSite(id);
    await this.prisma.featuredSite.delete({ where: { id } });
    await this.repackSites();
    return { ok: true };
  }

  async moveSite(id: string, direction: 'up' | 'down') {
    return this.move('featuredSite', id, direction);
  }

  private async requireKeyword(id: string) {
    const row = await this.prisma.featuredKeyword.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('인기 검색어를 찾을 수 없습니다.');
    return row;
  }

  private async requireSite(id: string) {
    const row = await this.prisma.featuredSite.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('추천 사이트를 찾을 수 없습니다.');
    return row;
  }

  private async repackKeywords() {
    const rows = await this.prisma.featuredKeyword.findMany({ orderBy: { position: 'asc' } });
    await this.prisma.$transaction(
      rows.map((row, index) =>
        this.prisma.featuredKeyword.update({ where: { id: row.id }, data: { position: index + 1 } }),
      ),
    );
  }

  private async repackSites() {
    const rows = await this.prisma.featuredSite.findMany({ orderBy: { position: 'asc' } });
    await this.prisma.$transaction(
      rows.map((row, index) =>
        this.prisma.featuredSite.update({ where: { id: row.id }, data: { position: index + 1 } }),
      ),
    );
  }

  private async move(model: 'featuredKeyword' | 'featuredSite', id: string, direction: 'up' | 'down') {
    const rows =
      model === 'featuredKeyword'
        ? await this.prisma.featuredKeyword.findMany({ orderBy: { position: 'asc' } })
        : await this.prisma.featuredSite.findMany({ orderBy: { position: 'asc' } });
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) throw new NotFoundException('항목을 찾을 수 없습니다.');
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= rows.length) return { ok: true };

    const a = rows[index];
    const b = rows[swap];
    if (model === 'featuredKeyword') {
      await this.prisma.$transaction([
        this.prisma.featuredKeyword.update({ where: { id: a.id }, data: { position: b.position } }),
        this.prisma.featuredKeyword.update({ where: { id: b.id }, data: { position: a.position } }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.featuredSite.update({ where: { id: a.id }, data: { position: b.position } }),
        this.prisma.featuredSite.update({ where: { id: b.id }, data: { position: a.position } }),
      ]);
    }
    return { ok: true };
  }
}
