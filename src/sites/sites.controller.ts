import { Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { HeartsService } from './hearts.service';
import { SitesService } from './sites.service';

@Controller('sites')
export class SitesController {
  constructor(
    private readonly sites: SitesService,
    private readonly hearts: HeartsService,
  ) {}

  @Get(':slug/heart')
  heartStatus(
    @Param('slug') slug: string,
    @Headers('x-visitor-key') visitorKey?: string,
  ) {
    return this.hearts.status(slug, visitorKey);
  }

  @Post(':slug/heart')
  like(
    @Param('slug') slug: string,
    @Headers('x-visitor-key') visitorKey: string,
    @Req() request: { ip?: string },
  ) {
    return this.hearts.like(slug, visitorKey ?? '', request.ip ?? 'unknown');
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.sites.detail(slug);
  }
}
