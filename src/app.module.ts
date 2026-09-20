import { Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AdsController } from './ads/ads.controller';
import { FeaturedController } from './featured/featured.controller';
import { HealthController } from './health.controller';
import { KeywordsController } from './keywords/keywords.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SitesController } from './sites/sites.controller';
import { SubmissionsController } from './submissions/submissions.controller';
import { UploadsController } from './uploads/uploads.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    HealthController,
    FeaturedController,
    KeywordsController,
    SitesController,
    SubmissionsController,
    AdsController,
    AdminController,
    UploadsController,
  ],
})
export class AppModule {}
