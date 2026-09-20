const categories = [
  { name: "패션", slug: "fashion", sortOrder: 1 },
  { name: "쇼핑", slug: "shopping", sortOrder: 2 },
  { name: "게임", slug: "game", sortOrder: 3 },
  { name: "취업", slug: "jobs", sortOrder: 4 },
  { name: "디자인-리소스", slug: "design-resources", sortOrder: 5 },
  { name: "교육", slug: "education", sortOrder: 6 },
  { name: "도구", slug: "tools", sortOrder: 7 },
  { name: "커뮤니티", slug: "community", sortOrder: 8 },
  { name: "기타", slug: "etc", sortOrder: 9 },
];

async function main() {
  console.log("AdminUser와 Category 시드는 DATABASE_URL 연결 후 구현합니다.");
  console.log(categories.map((c) => c.name).join(", "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
