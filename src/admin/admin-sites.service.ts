import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SiteStatus } from '@prisma/client';
import { splitNames } from '../common/split';
import { toSlug } from '../common/slug';
import { normalizeUrl } from '../common/url';
import { PrismaService } from '../prisma/prisma.service';

type SiteInput = {
  name: string;
  url: string;
  description: string;
  slug?: string;
  features?: string;
  status?: SiteStatus;
  categoryId: string;
  keywords?: string;
  tags?: string;
};

@Injectable()
export class AdminSitesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.site.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { category: true },
    });
  }

  async get(id: string) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        category: true,
        keywords: { include: { keyword: true } },
        tags: { include: { tag: true } },
      },
    });
    if (!site) throw new NotFoundException('사이트를 찾을 수 없습니다.');
    return {
      ...site,
      keywordsText: site.keywords.map((row) => row.keyword.name).join(', '),
      tagsText: site.tags.map((row) => row.tag.name).join(', '),
    };
  }

  async create(input: SiteInput, adminId: string) {
    const data = await this.prepare(input);
    await this.assertUniqueUrl(data.urlNormalized);
    const slug = await this.uniqueSlug(data.slug);
    const now = data.status === 'published' ? new Date() : null;

    return this.prisma.$transaction(async (tx) => {
      const site = await tx.site.create({
        data: {
          name: data.name,
          slug,
          url: data.url,
          urlNormalized: data.urlNormalized,
          description: data.description,
          features: data.features,
          language: 'ko',
          status: data.status,
          categoryId: data.categoryId,
          publishedAt: now,
          createdByAdminId: adminId,
        },
      });
      await this.syncKeywords(tx, site.id, data.keywordNames);
      await this.syncTags(tx, site.id, data.tagNames);
      return site;
    });
  }

  async update(id: string, input: SiteInput) {
    const existing = await this.prisma.site.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('사이트를 찾을 수 없습니다.');

    const data = await this.prepare(input);
    await this.assertUniqueUrl(data.urlNormalized, id);

    const wasPublished = existing.status === 'published';
    const slug = wasPublished
      ? existing.slug
      : await this.uniqueSlug(data.slug, id);
    const publishedAt =
      data.status === 'published'
        ? (existing.publishedAt ?? new Date())
        : existing.publishedAt;
    const unpublishedAt =
      data.status === 'unpublished' ? new Date() : existing.unpublishedAt;

    return this.prisma.$transaction(async (tx) => {
      const site = await tx.site.update({
        where: { id },
        data: {
          name: data.name,
          slug,
          url: data.url,
          urlNormalized: data.urlNormalized,
          description: data.description,
          features: data.features,
          status: data.status,
          categoryId: data.categoryId,
          publishedAt,
          unpublishedAt,
        },
      });
      await tx.siteKeyword.deleteMany({ where: { siteId: id } });
      await tx.siteTag.deleteMany({ where: { siteId: id } });
      await this.syncKeywords(tx, id, data.keywordNames);
      await this.syncTags(tx, id, data.tagNames);
      return site;
    });
  }

  private async prepare(input: SiteInput) {
    const name = input.name?.trim();
    const description = input.description?.trim();
    if (!name) throw new BadRequestException('사이트 이름이 필요합니다.');
    if (!description) throw new BadRequestException('소개문이 필요합니다.');

    const category = await this.prisma.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) throw new BadRequestException('카테고리를 선택하세요.');

    let urlNormalized: string;
    try {
      urlNormalized = normalizeUrl(input.url);
    } catch {
      throw new BadRequestException('URL 형식이 올바르지 않습니다.');
    }

    const status = input.status === 'unpublished' ? 'unpublished' : 'published';
    const slug = toSlug(input.slug?.trim() || name);
    if (!slug) throw new BadRequestException('슬러그를 만들 수 없습니다.');

    return {
      name,
      description,
      url: input.url.trim(),
      urlNormalized,
      slug,
      features: input.features?.trim() || null,
      status: status as SiteStatus,
      categoryId: category.id,
      keywordNames: splitNames(input.keywords),
      tagNames: splitNames(input.tags),
    };
  }

  private async assertUniqueUrl(urlNormalized: string, exceptId?: string) {
    const found = await this.prisma.site.findUnique({ where: { urlNormalized } });
    if (found && found.id !== exceptId) {
      throw new ConflictException('이미 등록된 URL입니다.');
    }
  }

  private async uniqueSlug(base: string, exceptId?: string) {
    let slug = base;
    let n = 2;
    while (true) {
      const found = await this.prisma.site.findUnique({ where: { slug } });
      if (!found || found.id === exceptId) return slug;
      slug = `${base}-${n}`;
      n += 1;
    }
  }

  private async syncKeywords(
    tx: Prisma.TransactionClient,
    siteId: string,
    names: string[],
  ) {
    for (const name of names) {
      const slug = toSlug(name);
      const keyword = await tx.keyword.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
      });
      await tx.siteKeyword.create({
        data: { siteId, keywordId: keyword.id },
      });
    }
  }

  private async syncTags(
    tx: Prisma.TransactionClient,
    siteId: string,
    names: string[],
  ) {
    for (const name of names) {
      const slug = toSlug(name);
      const tag = await tx.tag.upsert({
        where: { slug },
        update: {},
        create: { name, slug },
      });
      await tx.siteTag.create({ data: { siteId, tagId: tag.id } });
    }
  }
}
