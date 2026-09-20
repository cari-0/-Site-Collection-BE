import { Controller, Get } from '@nestjs/common';
import { FeaturedService } from './featured.service';

@Controller('featured')
export class FeaturedController {
  constructor(private readonly featured: FeaturedService) {}

  @Get()
  list() {
    return this.featured.list();
  }
}
