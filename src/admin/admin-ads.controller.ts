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
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AdminGuard } from '../auth/admin.guard';
import { AdminAdsService } from './admin-ads.service';

class SlotDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  keyword!: string;

  @IsString()
  startsOn!: string;

  @IsString()
  endsOn!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

class SlotPatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  keyword?: string;

  @IsOptional()
  @IsString()
  startsOn?: string;

  @IsOptional()
  @IsString()
  endsOn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  endNow?: boolean;
}

class RejectDto {
  @IsOptional()
  @IsString()
  @MaxLength(400)
  rejectNote?: string;
}

@Controller('admin/ads')
@UseGuards(AdminGuard)
export class AdminAdsController {
  constructor(private readonly ads: AdminAdsService) {}

  @Get('requests')
  requests() {
    return this.ads.listRequests();
  }

  @Get('slots')
  slots() {
    return this.ads.listSlots();
  }

  @Post('requests/:id/convert')
  convert(
    @Param('id') id: string,
    @Body() body: SlotDto,
    @Req() request: { admin: { id: string } },
  ) {
    return this.ads.convert(id, body, request.admin.id);
  }

  @Patch('requests/:id/reject')
  reject(@Param('id') id: string, @Body() body: RejectDto) {
    return this.ads.reject(id, body.rejectNote);
  }

  @Post('slots')
  createSlot(@Body() body: SlotDto) {
    return this.ads.createSlotDirect(body);
  }

  @Patch('slots/:id')
  updateSlot(@Param('id') id: string, @Body() body: SlotPatchDto) {
    return this.ads.updateSlot(id, body);
  }
}
