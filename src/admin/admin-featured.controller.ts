import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { AdminFeaturedService } from './admin-featured.service';

class KeywordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

class SiteDto {
  @IsString()
  @MinLength(1)
  siteId!: string;
}

class MoveDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}

@Controller('admin/featured')
@UseGuards(AdminGuard)
export class AdminFeaturedController {
  constructor(private readonly featured: AdminFeaturedService) {}

  @Get()
  list() {
    return this.featured.list();
  }

  @Post('keywords')
  addKeyword(@Body() body: KeywordDto) {
    return this.featured.addKeyword(body.name);
  }

  @Delete('keywords/:id')
  removeKeyword(@Param('id') id: string) {
    return this.featured.removeKeyword(id);
  }

  @Patch('keywords/:id/move')
  moveKeyword(@Param('id') id: string, @Body() body: MoveDto) {
    return this.featured.moveKeyword(id, body.direction);
  }

  @Post('sites')
  addSite(@Body() body: SiteDto) {
    return this.featured.addSite(body.siteId);
  }

  @Delete('sites/:id')
  removeSite(@Param('id') id: string) {
    return this.featured.removeSite(id);
  }

  @Patch('sites/:id/move')
  moveSite(@Param('id') id: string, @Body() body: MoveDto) {
    return this.featured.moveSite(id, body.direction);
  }
}
