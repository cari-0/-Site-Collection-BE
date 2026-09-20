# 유사모 BE

유익한 사이트 모음 API. NestJS, TypeScript, Prisma, PostgreSQL.

저장소: https://github.com/cari-0/-Site-Collection-BE

## 실행

```bash
cd BE
npm install
copy .env.example .env
npx prisma generate
npm run start:dev
```

- 헬스: http://localhost:4000/health
- API 접두사: `/api` (버전 없음. `/api/v1` 쓰지 않음)
- FE 기본 origin: `http://localhost:3000`

## 지금 있는 것

| 메서드 | 경로 | 상태 |
| --- | --- | --- |
| GET | `/health` | 동작 |
| GET | `/api/featured` | 빈 목록 |
| GET | `/api/k/:slug` | 빈 랜딩 |
| GET | `/api/sites/:slug` | 404 스텁 |
| POST | `/api/submissions` | 501 |
| POST | `/api/ads/apply` | 501 |
| POST | `/api/admin/login` | 501 |
| GET | `/api/admin/me` | 501 |
| POST | `/api/uploads` | 501 |

스키마는 `prisma/schema.prisma`. migrate/seed는 DB URL을 넣은 다음 단계.

## 규칙

- 검색엔진·크롤러가 아니다. DB에 있는 사이트만 반환한다.
- 일반 회원·결제·광고 금액 컬럼 없음.
- `AdSlot` 상태는 날짜로 계산한다.
- 손님 검색만으로 Keyword 행을 만들지 않는다.
