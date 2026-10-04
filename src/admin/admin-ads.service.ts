import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MAX_ADS_PER_KEYWORD } from '../common/constants';
import { parseSeoulDate, seoulToday, slotPhase, ymd } from '../common/date';
import { toSlug } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';
import { AdminSitesService } from './admin-sites.service';

type SlotInput = {
  siteId?: string;
  keyword?: string;
  startsOn: string;
  endsOn: string;
  priority?: number;
  categoryId?: string;
  endNow?: boolean;
};

@Injectable()
export class AdminAdsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sites: AdminSitesService,
  ) {}

  listRequests() {
    return this.prisma.adRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { category: true, site: { select: { id: true, name: true, slug: true } } },
    });
  }

  async listSlots() {
    const today = seoulToday();
    const slots = await this.prisma.adSlot.findMany({
      orderBy: [{ startsOn: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        site: { select: { id: true, name: true, slug: true } },
        keyword: { select: { id: true, name: true, slug: true } },
      },
    });
    return slots.map((slot) => ({
      ...slot,
      startsOn: ymd(slot.startsOn),
      endsOn: ymd(slot.endsOn),
      phase: slotPhase(slot.startsOn, slot.endsOn, today),
    }));
  }

  async reject(id: string, rejectNote?: string) {
    const request = await this.requirePending(id);
    return this.prisma.adRequest.update({
      where: { id: request.id },
      data: {
        status: 'rejected',
        rejectNote: rejectNote?.trim() || null,
        reviewedAt: new Date(),
      },
    });
  }

  async convert(id: string, input: SlotInput, adminId: string) {
    const request = await this.requirePending(id);
    const site = await this.resolveSite(request, input, adminId);
    const result = await this.createSlotsForSite({
      siteId: site.id,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      priority: input.priority,
      adRequestId: request.id,
    });
    await this.prisma.adRequest.update({
      where: { id: request.id },
      data: {
        status: 'converted',
        siteId: site.id,
        reviewedAt: new Date(),
      },
    });
    return result;
  }

  async createSlotDirect(input: SlotInput) {
    if (!input.siteId) throw new BadRequestException('사이트를 선택하세요.');
    return this.createSlotsForSite({
      siteId: input.siteId,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      priority: input.priority,
    });
  }

  async updateSlot(id: string, input: Partial<SlotInput> & { endNow?: boolean }) {
    const slot = await this.prisma.adSlot.findUnique({
      where: { id },
      include: { keyword: true },
    });
    if (!slot) throw new NotFoundException('슬롯을 찾을 수 없습니다.');

    const today = seoulToday();
    const startsOn = input.endNow
      ? slot.startsOn
      : this.parseDate(input.startsOn || ymd(slot.startsOn));
    const endsOn = input.endNow ? today : this.parseDate(input.endsOn || ymd(slot.endsOn));
    if (ymd(endsOn) < ymd(startsOn)) {
      throw new BadRequestException('종료일은 시작일 이후여야 합니다.');
    }

    const keyword = input.keyword?.trim()
      ? await this.upsertKeyword(input.keyword)
      : { id: slot.keywordId };

    await this.assertCapacity(keyword.id, slot.id);
    if (keyword.id !== slot.keywordId) {
      await this.ensureSiteKeyword(slot.siteId, keyword.id);
    }

    const updated = await this.prisma.adSlot.update({
      where: { id },
      data: {
        keywordId: keyword.id,
        startsOn,
        endsOn,
        priority: input.priority ?? slot.priority,
      },
      include: {
        site: { select: { id: true, name: true, slug: true } },
        keyword: { select: { id: true, name: true, slug: true } },
      },
    });
    return {
      ...updated,
      startsOn: ymd(updated.startsOn),
      endsOn: ymd(updated.endsOn),
      phase: slotPhase(updated.startsOn, updated.endsOn),
    };
  }

  private async createSlotsForSite(input: {
    siteId: string;
    startsOn: string;
    endsOn: string;
    priority?: number;
    adRequestId?: string;
  }) {
    const names = await this.siteKeywordNames(input.siteId);
    if (!names.length) {
      throw new BadRequestException('사이트에 키워드가 없습니다. 사이트에 키워드를 먼저 붙여 주세요.');
    }

    const slots: Array<{ id: string }> = [];
    const skipped: string[] = [];
    for (const [index, name] of names.entries()) {
      try {
        const slot = await this.createSlot({
          siteId: input.siteId,
          keyword: name,
          startsOn: input.startsOn,
          endsOn: input.endsOn,
          priority: input.priority,
          adRequestId: index === 0 ? input.adRequestId : undefined,
        });
        slots.push({ id: slot.id });
      } catch (error) {
        if (error instanceof BadRequestException) {
          skipped.push(name);
          continue;
        }
        throw error;
      }
    }
    if (!slots.length) {
      throw new BadRequestException('이 사이트의 키워드 광고 자리가 가득 찼습니다.');
    }
    return { slots, skipped };
  }

  private async siteKeywordNames(siteId: string) {
    const rows = await this.prisma.siteKeyword.findMany({
      where: { siteId },
      include: { keyword: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => row.keyword.name);
  }

  private async createSlot(input: {
    siteId: string;
    keyword: string;
    startsOn: string;
    endsOn: string;
    priority?: number;
    adRequestId?: string;
  }) {
    const site = await this.prisma.site.findUnique({ where: { id: input.siteId } });
    if (!site) throw new NotFoundException('사이트를 찾을 수 없습니다.');
    if (site.status !== 'published' || site.language !== 'ko') {
      throw new BadRequestException('공개된 한국 사이트만 광고할 수 있습니다.');
    }

    const startsOn = this.parseDate(input.startsOn);
    const endsOn = this.parseDate(input.endsOn);
    if (ymd(endsOn) < ymd(startsOn)) {
      throw new BadRequestException('종료일은 시작일 이후여야 합니다.');
    }

    const keyword = await this.upsertKeyword(input.keyword);
    await this.assertCapacity(keyword.id);
    await this.ensureSiteKeyword(site.id, keyword.id);

    const slot = await this.prisma.adSlot.create({
      data: {
        siteId: site.id,
        keywordId: keyword.id,
        startsOn,
        endsOn,
        priority: input.priority ?? 0,
        adRequestId: input.adRequestId,
      },
      include: {
        site: { select: { id: true, name: true, slug: true } },
        keyword: { select: { id: true, name: true, slug: true } },
      },
    });
    return {
      ...slot,
      startsOn: ymd(slot.startsOn),
      endsOn: ymd(slot.endsOn),
      phase: slotPhase(slot.startsOn, slot.endsOn),
    };
  }

  private async resolveSite(
    request: {
      url: string;
      urlNormalized: string;
      name: string;
      description: string;
      keywordsText: string;
      categoryId: string | null;
      siteId: string | null;
    },
    input: SlotInput,
    adminId: string,
  ) {
    const chosenId = input.siteId || request.siteId;
    if (chosenId) {
      const site = await this.prisma.site.findUnique({ where: { id: chosenId } });
      if (!site) throw new NotFoundException('사이트를 찾을 수 없습니다.');
      if (site.status !== 'published') {
        return this.prisma.site.update({
          where: { id: site.id },
          data: { status: 'published', publishedAt: site.publishedAt ?? new Date() },
        });
      }
      return site;
    }

    const found = await this.prisma.site.findUnique({
      where: { urlNormalized: request.urlNormalized },
    });
    if (found) {
      if (found.status !== 'published') {
        return this.prisma.site.update({
          where: { id: found.id },
          data: { status: 'published', publishedAt: found.publishedAt ?? new Date() },
        });
      }
      return found;
    }

    const categoryId =
      input.categoryId ||
      request.categoryId ||
      (await this.prisma.category.findUnique({ where: { slug: 'etc' } }))?.id;
    if (!categoryId) throw new BadRequestException('카테고리를 선택하세요.');

    return this.sites.create(
      {
        name: request.name,
        url: request.url,
        description: request.description,
        categoryId,
        keywords: request.keywordsText,
        status: 'published',
      },
      adminId,
    );
  }

  private async requirePending(id: string) {
    const request = await this.prisma.adRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('광고 문의를 찾을 수 없습니다.');
    if (request.status !== 'pending') {
      throw new BadRequestException('대기 중인 문의만 처리할 수 있습니다.');
    }
    return request;
  }

  private parseDate(value: string) {
    try {
      return parseSeoulDate(value);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : '날짜가 올바르지 않습니다.',
      );
    }
  }

  private async upsertKeyword(name: string) {
    const trimmed = name.trim();
    const slug = toSlug(trimmed);
    if (!slug) throw new BadRequestException('키워드가 필요합니다.');
    return this.prisma.keyword.upsert({
      where: { slug },
      update: {},
      create: { name: trimmed, slug },
    });
  }

  private async ensureSiteKeyword(siteId: string, keywordId: string) {
    await this.prisma.siteKeyword.upsert({
      where: { siteId_keywordId: { siteId, keywordId } },
      update: {},
      create: { siteId, keywordId },
    });
  }

  private async assertCapacity(keywordId: string, exceptId?: string) {
    const today = seoulToday();
    const overlapping = await this.prisma.adSlot.count({
      where: {
        keywordId,
        endsOn: { gte: today },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    if (overlapping >= MAX_ADS_PER_KEYWORD) {
      throw new BadRequestException(
        `이 키워드 광고는 예정·진행을 합쳐 ${MAX_ADS_PER_KEYWORD}개까지입니다.`,
      );
    }
  }
}
