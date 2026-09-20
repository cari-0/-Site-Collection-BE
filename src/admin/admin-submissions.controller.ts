import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { SubmissionsService } from '../submissions/submissions.service';

@Controller('admin/submissions')
@UseGuards(AdminGuard)
export class AdminSubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Get()
  list() {
    return this.submissions.list();
  }
}
