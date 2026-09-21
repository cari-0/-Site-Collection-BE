import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
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

  @Get(':id')
  get(@Param('id') id: string) {
    return this.submissions.get(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.submissions.remove(id);
  }
}
