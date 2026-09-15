# Our Wedding Planner

두 사람을 위한 개인용 결혼 준비 웹앱. 스프레드시트로 관리하던 결혼계획표를
**클릭 몇 번으로 기록하고, 예산·일정·진행률을 자동 계산해주는** 모바일 우선 PWA로 다시 만들었습니다.

- 결혼식: **2026-12-21** (설정에서 변경 가능) · Timezone: Asia/Seoul
- Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase · Framer Motion · Zustand · Lucide

## 주요 기능

| 영역 | 내용 |
| --- | --- |
| 홈 | D-Day 자동 계산, 초 단위 실시간 시계, 준비 진행률, 예산 사용률 도넛, 카테고리 비율, 지금 해야 할 일, 다가오는 일정/결제, 최근 활동, 즐겨찾기, 메모함 |
| 할 일 | 상태(시작 전/진행 중/대기/완료) 세그먼트, 마감·중요도·카테고리·담당, 필터/정렬, 체크 애니메이션 |
| 예산 | 카테고리·항목·결제 3단 구조, 견적 vs 실제 차액(±₩/%), 전체 예산 대비 비율, 결제 예정/미결제 자동 계산, 예산 상태(안전/주의/초과), 숫자 키패드 + 계산기 Bottom Sheet |
| 일정 | 목록/달력 토글, 예복 피팅·업체 방문·결제 예정일·신혼여행·청첩장 모임이 자동으로 모임 |
| 결혼 준비 | 식장(후보 비교, 계약), 예복, 헤어&메이크업, 부케, 사진/영상, 코디네이션(공통 Vendor + 카테고리 전용 필드), 음악(구간별) |
| 사람 | 하객(신랑측/신부측, 참석/미정/불참 원탭, 동반 인원 스테퍼, 통계), 청첩장 모임, 선물 |
| 여행 | 신혼여행 정보 + 출발 D-Day, 체크리스트, 여행 일정 |
| 설정 | 라이트/다크/시스템, 포인트 컬러 5종(CSS 변수 즉시 반영), 글자 크기 4단계, JSON 백업/복원, CSV 내보내기/가져오기(한글 헤더 지원), 계정·파트너 초대 코드 |

모든 입력은 **자동 저장**되고(저장 중…/저장됨 표시), 삭제는 **실행 취소**가 가능합니다.

## 실행

```bash
npm install
cp .env.example .env.local   # Supabase 값 입력 (없으면 로컬 저장 모드)
npm run dev
```

### 저장 방식

| 모드 | 조건 | 설명 |
| --- | --- | --- |
| **Supabase 모드** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 | 로그인 필수, 두 사람이 초대 코드로 같은 워크스페이스 공유, RLS로 보호, 실시간 동기화 |
| **로컬 저장 모드** | 환경변수 없음 | 로그인 없이 브라우저 localStorage에 저장. 개인 테스트/오프라인용. 설정 › 데이터 관리에서 JSON 백업 권장 |

두 모드는 같은 데이터 어댑터 인터페이스(`src/lib/db/adapter.ts`)를 구현하므로 화면 코드는 동일합니다.

### Supabase 설정

1. Supabase 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/0001_init.sql` 실행 (테이블, 인덱스, RLS, RPC, Storage 버킷, Realtime)
3. Authentication › URL Configuration에 배포 도메인과 `/auth/callback` 추가
4. `.env.local` 또는 Vercel 환경변수에 URL/anon key 설정

첫 로그인 후 `/onboarding`에서 워크스페이스를 만들거나(기본 카테고리·체크리스트 시드 옵션), 파트너의 초대 코드로 참여합니다.

### Vercel 배포

저장소를 Vercel에 연결하고 환경변수 두 개만 넣으면 됩니다. PWA 매니페스트(`public/manifest.webmanifest`)가 포함되어 있어 모바일 홈 화면에 추가해 앱처럼 쓸 수 있습니다.

## 구조

```
src/
  app/            라우트 (App Router) — (app) 그룹은 인증/워크스페이스 보호
  components/
    ui/           Button · Chip · Segmented · Stepper · Toggle · Sheet(Bottom Sheet/Modal) · MoneySheet(키패드+계산기) · Donut …
    layout/       AppShell · Sidebar · TopBar · BottomNav · MenuDrawer · QuickAdd(FAB)
    shared/       SchemaForm · EntitySheet · EntityCard (스키마 기반 폼/카드)
    home|tasks|budget|calendar|guests|…  기능별 화면
  lib/
    db/           types · adapter · local(localStorage) · supabase · seed · defaults
    store/        wedding-store(낙관적 업데이트 + 자동 저장 + 활동 로그 + 실행 취소) · settings-store · ui-store
    compute/      progress · budget · schedule(통합 일정) · guests · search
    date.ts / money.ts / export.ts
supabase/migrations/0001_init.sql
qa/               Playwright 스크립트 (viewport 스크린샷, 기능 시나리오)
```

## QA

```bash
npm run build && npx next start -p 3001
BASE=http://localhost:3001 node qa/flow.mjs                 # 생성/수정/삭제/새로고침 유지/계산/설정 24개 시나리오
BASE=http://localhost:3001 SEED=1 node qa/shot.mjs / home 390 844 [light|dark] [rose|sage|…] [1|1.1|1.2]
```

`qa/` 스크립트는 저장소에 포함되지 않는 스크린샷을 `qa/*.png`로 남깁니다.
