import { Injectable, OnModuleDestroy } from '@nestjs/common';

/** `npx prisma generate` 뒤 PrismaClient를 상속하도록 바꾼다. 지금은 DB 없이 서버가 뜨게 둔다. */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  async onModuleDestroy() {}
}
