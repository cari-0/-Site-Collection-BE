import { Controller, Get, Param } from '@nestjs/common';
import { SitesService } from './sites.service';

@Controller('sites')
export class SitesController {
  constructor(private readonly sites: SitesService) {}

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.sites.detail(slug);
  }
}
