import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const categories = [
  { name: '패션', slug: 'fashion', sortOrder: 1 },
  { name: '쇼핑', slug: 'shopping', sortOrder: 2 },
  { name: '게임', slug: 'game', sortOrder: 3 },
  { name: '취업', slug: 'jobs', sortOrder: 4 },
  { name: '디자인-리소스', slug: 'design-resources', sortOrder: 5 },
  { name: '교육', slug: 'education', sortOrder: 6 },
  { name: '도구', slug: 'tools', sortOrder: 7 },
  { name: '커뮤니티', slug: 'community', sortOrder: 8 },
  { name: '기타', slug: 'etc', sortOrder: 9 },
];

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL과 ADMIN_PASSWORD를 BE/.env에 넣으세요.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: category.sortOrder },
      create: category,
    });
  }

  console.log(`시드 완료: ${email}, 카테고리 ${categories.length}개`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
