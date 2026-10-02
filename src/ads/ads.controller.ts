import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { AdPeriodType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AdsService } from './ads.service';

class AdApplyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  url!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(300)
  description!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  keywords!: string;

  @IsEnum(AdPeriodType)
  periodType!: AdPeriodType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  periodNote?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() ? value.trim() : undefined))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  contactEmail?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() ? value.trim() : undefined))
  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  website?: string;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  consent!: boolean;
}

@Controller('ads')
export class AdsController {
  constructor(private readonly ads: AdsService) {}

  @Post('apply')
  @HttpCode(201)
  apply(@Body() body: AdApplyDto, @Req() request: { ip?: string }) {
    return this.ads.apply(body, request.ip ?? 'unknown');
  }
}
