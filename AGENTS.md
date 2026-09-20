# 유사모 BE — 에이전트 규칙

이 저장소는 **유사모** API다. NestJS + Prisma + PostgreSQL. 검색엔진·크롤러가 아니다.  
기획·테이블의 원본은 상위 `site-collection/`의 `요구사항.md`, `MVP-기능명세서.md`, `흐름-및-스키마.md`다. 스키마는 문서와 다르게 리팩터하지 않는다.

핵심 규칙을 앞에 둔다. 긴 예시는 쓰지 않는다.

---

## 0. AGENTS.md 보호 (최우선)

- 사용자가 **현재 요청에서 명시적으로 허용하지 않으면** 이 파일을 수정·이동·삭제·이름 변경하지 않는다.
- 규칙 충돌이나 개선 필요는 코드 변경과 **분리해 보고**한다. 허용받은 경우에도 요청 범위만 최소 수정한다.
- `AGENTS.override.md`나 도구별 파일을 만들어 규칙을 우회하지 않는다.
- 공용 규칙 변경은 별도 PR과 팀 리뷰를 거친다.
- 수정 후 UTF-8 파일 크기를 확인하고 Codex 기본 로딩 한도인 **32KiB 미만**을 유지한다. 반복 예시는 줄이고 핵심 규칙을 앞쪽에 둔다.
- `next.config.ts`의 `agentRules: false`를 켜지 않는다. Next가 이 파일을 덮어쓰지 않게 한다.

BE에는 Next가 없다. Nest CLI가 `AGENTS.md`/`CLAUDE.md`를 새로 만들면 규칙으로 채택하지 않고 삭제한다.

---

## 1. 제품에서 자주 틀리는 점

- DB에 있는 사이트만 반환한다. Elasticsearch, 외부 크롤, “웹 전체 검색”을 붙이지 않는다.
- 일반 **User 테이블, 회원가입, 즐겨찾기, 리뷰, 결제, 광고 금액 컬럼**은 없다.
- 공개 조건: `published` + `language = ko` + 소개문 있음. 성인·도박·불법·피싱은 거절.
- 제보자 연락처·원문 IP를 저장하지 않는다. IP는 해시만. 광고 문의 연락처는 협의용이다.
- 손님 검색만으로 `Keyword` 행을 만들지 않는다. Keyword는 관리자가 붙이거나 인기검색어/AdSlot을 넣을 때.
- 제보 승인 전에는 **Site를 만들지 않는다**. pending `Submission`만.

---

## 2. HTTP·라우트

- 글로벌 prefix는 `api` 한 겹이다. `/api/v1`을 만들지 않는다. `/health`는 prefix 밖.
- 포트 기본 **4000**. FE(3000)와 바꾸지 않는다.
- CORS는 `FRONTEND_ORIGIN`만. `origin: true` / `*` + credentials를 켜지 않는다.
- 검색 목록 API를 `?q=` 전용으로 새로 두지 않는다. 랜딩은 `GET /api/k/:slug`.
- 한글 슬러그를 로마자·ASCII로 바꾸지 않는다. `키작녀 쇼핑몰` → `키작녀-쇼핑몰`.
- 한 번 공개된 사이트 슬러그는 변경하지 않는다.
- unpublished 상세는 404. 빈 객체 200으로 숨기지 않는다.
- 이미지 업로드는 `POST /api/uploads` 하나, **관리자 세션 필수**. 제보·광고·CRUD는 각 컨트롤러. 공개 멀티파트 업로드를 열지 않는다.

---

## 3. 광고 vs 일반

- 광고 배열과 일반 배열을 섞거나, 광고 점수로 일반 순위를 올리지 않는다.
- `AdSlot.status` 컬럼을 추가하지 않는다. `startsOn`~`endsOn`(포함)과 **한국 날짜 오늘**로 계산한다. UTC 날짜만 보고 하루 어긋나지 않게 한다.
- 키워드당 오늘 유효 AD 최대 3. 겹치는 슬롯이 3을 넘으면 저장 거부.
- 그 키워드 AD에 이미 나온 `siteId`는 일반 결과에서 뺀다.
- 클릭 로그·단가·결제 웹훅을 넣지 않는다.

일반 정렬: 키워드 정확 일치 → 사이트명 포함 → 소개/태그 부분 일치. 동점이면 `publishedAt` 최신. 페이지 크기 30.

---

## 4. 데이터·Prisma

- 스키마 원본은 `흐름-및-스키마.md` + `prisma/schema.prisma`. User, Session, AdSlot.status, 금액, 이미지 테이블을 추가하지 않는다.
- 중복 키는 `urlNormalized`. 저장 전 https, 소문자, `www.` 제거, 끝 `/` 제거, utm/gclid/fbclid 제거.
- 같은 `urlNormalized`의 pending 제보가 있으면 새 제보를 만들지 않는다. 이미 published면 Site 슬러그만 안내.
- 이미지는 `imageKey`/`imageUrl`만. jpeg/png/webp, 최대 5MB.
- Prisma는 `PrismaService` 한 개. 컨트롤러에서 `new PrismaClient()` 하지 않는다.
- generate 없이 `@prisma/client`를 상속해 빌드를 깨지 않는다. DB 전에는 스텁을 유지한다.
- FE `prisma/`와 스키마를 다르게 키우지 않는다. 테이블 추가는 BE 스키마가 기준이다.

시드: AdminUser 1 + Category 9개. 개발용 사이트 2~3개만. 80~100개는 관리자 API로.

---

## 5. 인증

- 손님 인증 없음. 관리자만 `POST /api/admin/login`.
- `AUTH_SECRET`을 코드에 `"secret"`으로 넣지 않는다. `.env`만. 쿼리스트링에 JWT를 두지 않는다.
- `ADMIN_PASSWORD`를 평문으로 DB에 넣지 않는다. 해시만.
- `/api/admin/*`(login 제외)와 `/api/uploads`는 가드 없이 열지 않는다.
- 제보 5/10분, 광고 문의 3/10분. 레이트리밋을 “나중에”라며 빼지 않는다.

---

## 6. 구조 (과설계 금지)

- Nest 기본: `src/` 컨트롤러 + `common/` + `prisma/`. hexagonal, CQRS, `packages/`, gRPC, GraphQL, Kafka를 요청 없이 넣지 않는다.
- 도메인마다 폴더가 늘어나는 것은 허용. `features/entities` 이중 래핑은 금지.
- Swagger를 기본 세팅에 넣지 않는다. 필요하면 따로 요청받는다.

---

## 7. Git·비밀·범위

- remote는 `https://github.com/cari-0/-Site-Collection-BE.git`다. 앞의 `-`를 빼거나 FE remote에 푸시하지 않는다.
- `.env`를 커밋하지 않는다. `.env.example`만. 사용자 `.env`를 덮어쓰지 않는다.
- 사용자가 시키지 않으면 커밋·푸시하지 않는다. `main` 강제 푸시, `--no-verify` 하지 않는다.
- 요청 밖의 리팩터, 새 라이브러리, README 장문을 하지 않는다.
- FE `AGENTS.md`를 BE 작업 중에 수정하지 않는다.
