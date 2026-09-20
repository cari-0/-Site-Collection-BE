import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SubmissionsService } from './submissions.service';

class SubmitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  url!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(400)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  keywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  website?: string;
}

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post()
  @HttpCode(201)
  create(@Body() body: SubmitDto, @Req() request: { ip?: string }) {
    return this.submissions.create(body, request.ip ?? 'unknown');
  }
}
