import { Controller, Get, Param, Req } from '@nestjs/common';
import { SearchService } from '../search/search.service';

@Controller('k')
export class KeywordsController {
  constructor(private readonly search: SearchService) {}

  @Get(':slug')
  landing(@Param('slug') slug: string, @Req() request: { ip?: string }) {
    return this.search.landing(slug, request.ip ?? 'unknown');
  }
}
