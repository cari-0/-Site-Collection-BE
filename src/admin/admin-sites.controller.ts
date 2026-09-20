import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SiteStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { AdminSitesService } from './admin-sites.service';

class SiteDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  url!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  features?: string;

  @IsOptional()
  @IsEnum(SiteStatus)
  status?: SiteStatus;

  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}

@Controller('admin/sites')
@UseGuards(AdminGuard)
export class AdminSitesController {
  constructor(private readonly sites: AdminSitesService) {}

  @Get()
  list() {
    return this.sites.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.sites.get(id);
  }

  @Post()
  create(
    @Body() body: SiteDto,
    @Req() request: { admin: { id: string } },
  ) {
    return this.sites.create(body, request.admin.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: SiteDto) {
    return this.sites.update(id, body);
  }
}
