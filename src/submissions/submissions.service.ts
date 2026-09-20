import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { hashIp } from '../common/hash';
import { allowRequest } from '../common/rate-limit';
import { parsePublicUrl } from '../common/url';
import { PrismaService } from '../prisma/prisma.service';

type SubmitInput = {
  name: string;
  url: string;
  description: string;
  keywords?: string;
  website?: string;
};

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: SubmitInput, ip: string) {
    if (input.website?.trim()) {
      throw new BadRequestException('요청을 처리할 수 없습니다.');
    }

    const name = input.name?.trim() ?? '';
    const description = input.description?.trim() ?? '';
    const keywordsText = (input.keywords ?? '').trim();
    if (name.length < 1 || name.length > 80) {
      throw new BadRequestException('사이트 이름은 1~80자입니다.');
    }
    if (description.length < 8 || description.length > 400) {
      throw new BadRequestException('소개는 8~400자입니다.');
    }
    if (keywordsText.length > 200) {
      throw new BadRequestException('키워드가 너무 깁니다.');
    }

    let urlNormalized: string;
    try {
      urlNormalized = parsePublicUrl(input.url);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'URL이 올바르지 않습니다.',
      );
    }

    if (!allowRequest(`submit:${ip}`, 5, 10 * 60 * 1000)) {
      throw new HttpException('제보는 10분에 5회까지입니다.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!allowRequest(`submit-day:${ip}`, 20, 24 * 60 * 60 * 1000)) {
      throw new HttpException('오늘 제보 한도를 넘었습니다.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const published = await this.prisma.site.findUnique({
      where: { urlNormalized },
      select: { slug: true, status: true },
    });
    if (published?.status === 'published') {
      throw new HttpException(
        { message: '이미 등록된 사이트입니다.', slug: published.slug, code: 'already_published' },
        HttpStatus.CONFLICT,
      );
    }

    const pending = await this.prisma.submission.findFirst({
      where: { urlNormalized, status: 'pending' },
    });
    if (pending) {
      throw new HttpException(
        { message: '같은 주소가 이미 검토 중입니다.', code: 'already_pending' },
        HttpStatus.CONFLICT,
      );
    }

    const submission = await this.prisma.submission.create({
      data: {
        name,
        url: input.url.trim(),
        urlNormalized,
        description,
        keywordsText,
        status: 'pending',
        ipHash: hashIp(ip),
      },
    });

    return { id: submission.id, status: submission.status };
  }

  list() {
    return this.prisma.submission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        url: true,
        description: true,
        keywordsText: true,
        status: true,
        createdAt: true,
      },
    });
  }
}
