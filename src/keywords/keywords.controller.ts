import { Controller, Get, Param } from '@nestjs/common';
import { SearchService } from '../search/search.service';

@Controller('k')
export class KeywordsController {
  constructor(private readonly search: SearchService) {}

  @Get(':slug')
  landing(@Param('slug') slug: string) {
    return this.search.landing(slug);
  }
}
