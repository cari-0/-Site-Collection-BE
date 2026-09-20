import { Controller, Get } from '@nestjs/common';

@Controller('featured')
export class FeaturedController {
  @Get()
  list() {
    return { keywords: [], sites: [] };
  }
}
