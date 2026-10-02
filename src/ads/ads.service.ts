import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AdPeriodType } from '@prisma/client';
import { hashIp } from '../common/hash';
import { allowRequest } from '../common/rate-limit';
import { splitNames } from '../common/split';
import { parsePublicUrl } from '../common/url';
import { PrismaService } from '../prisma/prisma.service';

type ApplyInput = {
  name: string;
  url: string;
  description: string;
  categoryId?: string;
  keywords?: string;
  periodType?: AdPeriodType;
  periodNote?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  consent?: boolean;
};

@Injectable()
export class AdsService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(input: ApplyInput, ip: string) {
    if (input.website?.trim()) {
      throw new BadRequestException('요청을 처리할 수 없습니다.');
    }
    if (input.consent !== true) {
      throw new BadRequestException('연락처 이용 안내에 동의해 주세요.');
    }

    const name = input.name?.trim() ?? '';
    const description = input.description?.trim() ?? '';
    const keywordsText = (input.keywords ?? '').trim();
    const periodType = input.periodType ?? AdPeriodType.days7;
    const periodNote = input.periodNote?.trim() || null;
    const contactEmail = input.contactEmail?.trim() || null;
    const contactPhone = input.contactPhone?.trim() || null;

    if (name.length < 2 || name.length > 80) {
      throw new BadRequestException('사이트 이름은 2~80자입니다.');
    }
    if (description.length < 20 || description.length > 300) {
      throw new BadRequestException('소개는 20~300자입니다.');
    }
    const keywordNames = splitNames(keywordsText);
    if (keywordNames.length < 1 || keywordNames.length > 5) {
      throw new BadRequestException('희망 키워드는 1~5개입니다.');
    }
    if (periodType === AdPeriodType.other && !periodNote) {
      throw new BadRequestException('기타 기간을 적어 주세요.');
    }
    if (!contactEmail && !contactPhone) {
      throw new BadRequestException('이메일 또는 전화 중 하나는 필요합니다.');
    }
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      throw new BadRequestException('이메일 형식이 올바르지 않습니다.');
    }

    let urlNormalized: string;
    try {
      urlNormalized = parsePublicUrl(input.url);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'URL이 올바르지 않습니다.',
      );
    }

    let categoryId: string | null = input.categoryId?.trim() || null;
    if (categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new BadRequestException('카테고리를 선택하세요.');
    } else {
      const fallback = await this.prisma.category.findUnique({ where: { slug: 'etc' } });
      categoryId = fallback?.id ?? null;
    }

    if (!allowRequest(`ad:${ip}`, 3, 10 * 60 * 1000)) {
      throw new HttpException('광고 문의는 10분에 3회까지입니다.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const request = await this.prisma.adRequest.create({
      data: {
        name,
        url: input.url.trim(),
        urlNormalized,
        description,
        categoryId,
        keywordsText,
        periodType,
        periodNote,
        contactEmail,
        contactPhone,
        status: 'pending',
        ipHash: hashIp(ip),
      },
    });

    return { id: request.id, status: request.status };
  }
}
