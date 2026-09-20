import { Controller, Get, Param } from '@nestjs/common';
import { MAX_ADS_PER_KEYWORD, PAGE_SIZE } from '../common/constants';
import { slugToDisplayName } from '../common/slug';

@Controller('k')
export class KeywordsController {
  @Get(':slug')
  landing(@Param('slug') slug: string) {
    return {
      name: slugToDisplayName(slug),
      slug,
      ads: [],
      sites: [],
      total: 0,
      pageSize: PAGE_SIZE,
      maxAds: MAX_ADS_PER_KEYWORD,
    };
  }
}
