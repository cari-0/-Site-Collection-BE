import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SEARCH_WINDOW_DAYS } from '../common/constants';
import { toSlug } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminFeaturedService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const since = new Date(Date.now() - SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const [flags, counts] = await Promise.all([
      this.prisma.featuredKeyword.findMany({
        orderBy: { position: 'asc' },
        include: { keyword: true },
      }),
      this.prisma.searchEvent.groupBy({
        by: ['keywordId'],
        where: { createdAt: { gte: since }, keywordId: { not: null } },
        _count: { keywordId: true },
      }),
    ]);

    const countMap = new Map(
      counts.filter((row) => row.keywordId).map((row) => [row.keywordId as string, row._count.keywordId]),
    );
    const keywordIds = [...new Set([...flags.map((row) => row.keywordId), ...countMap.keys()])];
    const keywords = keywordIds.length
      ? await this.prisma.keyword.findMany({ where: { id: { in: keywordIds } } })
      : [];
    const nameMap = new Map(keywords.map((row) => [row.id, row]));

    const trending = [...countMap.entries()]
      .map(([keywordId, count]) => {
        const keyword = nameMap.get(keywordId);
        const flag = flags.find((row) => row.keywordId === keywordId);
        if (!keyword) return null;
        return {
          keywordId,
          name: keyword.name,
          slug: keyword.slug,
          count,
          pinned: Boolean(flag?.pinned),
          hidden: Boolean(flag?.hidden),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    return {
      pinned: flags
        .filter((row) => row.pinned && !row.hidden)
        .map((row) => ({
          id: row.id,
          keywordId: row.keywordId,
          name: row.keyword.name,
          slug: row.keyword.slug,
          position: row.position,
          count: countMap.get(row.keywordId) ?? 0,
        })),
      hidden: flags
        .filter((row) => row.hidden)
        .map((row) => ({
          id: row.id,
          keywordId: row.keywordId,
          name: row.keyword.name,
          slug: row.keyword.slug,
          count: countMap.get(row.keywordId) ?? 0,
        })),
      trending,
    };
  }

  async setKeyword(name: string, action: 'pin' | 'hide') {
    const trimmed = name.trim();
    const slug = toSlug(trimmed);
    if (!slug) throw new BadRequestException('키워드를 입력하세요.');

    const keyword = await this.prisma.keyword.findFirst({
      where: { OR: [{ slug }, { name: trimmed }] },
    });
    if (!keyword) throw new NotFoundException('등록된 키워드만 고정하거나 숨길 수 있습니다.');

    const last = await this.prisma.featuredKeyword.aggregate({ _max: { position: true } });
    return this.prisma.featuredKeyword.upsert({
      where: { keywordId: keyword.id },
      update: {
        pinned: action === 'pin',
        hidden: action === 'hide',
      },
      create: {
        keywordId: keyword.id,
        position: (last._max.position ?? 0) + 1,
        pinned: action === 'pin',
        hidden: action === 'hide',
      },
    });
  }

  async removeKeyword(id: string) {
    await this.requireKeyword(id);
    await this.prisma.featuredKeyword.delete({ where: { id } });
    await this.repackPinned();
    return { ok: true };
  }

  async moveKeyword(id: string, direction: 'up' | 'down') {
    const rows = await this.prisma.featuredKeyword.findMany({
      where: { pinned: true, hidden: false },
      orderBy: { position: 'asc' },
    });
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) throw new NotFoundException('고정 검색어를 찾을 수 없습니다.');
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= rows.length) return { ok: true };
    const a = rows[index];
    const b = rows[swap];
    await this.prisma.$transaction([
      this.prisma.featuredKeyword.update({ where: { id: a.id }, data: { position: b.position } }),
      this.prisma.featuredKeyword.update({ where: { id: b.id }, data: { position: a.position } }),
    ]);
    return { ok: true };
  }

  private async requireKeyword(id: string) {
    const row = await this.prisma.featuredKeyword.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('항목을 찾을 수 없습니다.');
    return row;
  }

  private async repackPinned() {
    const rows = await this.prisma.featuredKeyword.findMany({
      where: { pinned: true, hidden: false },
      orderBy: { position: 'asc' },
    });
    await this.prisma.$transaction(
      rows.map((row, index) =>
        this.prisma.featuredKeyword.update({ where: { id: row.id }, data: { position: index + 1 } }),
      ),
    );
  }
}
