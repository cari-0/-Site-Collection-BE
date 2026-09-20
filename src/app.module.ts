import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminSitesController } from './admin/admin-sites.controller';
import { AdminSitesService } from './admin/admin-sites.service';
import { AdminController } from './admin/admin.controller';
import { AdsController } from './ads/ads.controller';
import { AuthModule } from './auth/auth.module';
import { FeaturedController } from './featured/featured.controller';
import { FeaturedService } from './featured/featured.service';
import { HealthController } from './health.controller';
import { KeywordsController } from './keywords/keywords.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SearchService } from './search/search.service';
import { SitesController } from './sites/sites.controller';
import { SitesService } from './sites/sites.service';
import { SubmissionsController } from './submissions/submissions.controller';
import { UploadsController } from './uploads/uploads.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
  controllers: [
    HealthController,
    FeaturedController,
    KeywordsController,
    SitesController,
    SubmissionsController,
    AdsController,
    AdminController,
    AdminSitesController,
    UploadsController,
  ],
  providers: [AdminSitesService, SearchService, SitesService, FeaturedService],
})
export class AppModule {}
