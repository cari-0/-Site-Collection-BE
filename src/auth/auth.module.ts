import { Module } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AuthService } from './auth.service';

@Module({
  providers: [AuthService, AdminGuard],
  exports: [AuthService, AdminGuard],
})
export class AuthModule {}
