# 둘이 같이 쓰기 — Supabase 연결

이 앱은 두 가지 모드로 돕니다.

| 모드 | 저장 위치 | 둘이 같이 보기 |
| --- | --- | --- |
| 로컬 저장 (환경변수 없음) | 내 브라우저 안 | **안 됩니다** |
| Supabase (환경변수 있음) | 공용 데이터베이스 | 됩니다. 한 사람이 고치면 상대 화면에 바로 반영 |

두 사람이 같은 화면을 보고 서로의 수정이 실시간으로 연동되려면 **중간에 데이터를 들고 있을 서버가 반드시 필요**합니다.
브라우저 저장소는 기기 밖으로 나가지 않기 때문입니다. 이 앱은 그 서버로 Supabase를 씁니다. 무료 플랜으로 충분합니다.

전체 15분 정도 걸립니다.

---

> ## ⚠️ 쓰던 Supabase 프로젝트에 설치하지 마세요
>
> 이 앱은 `tasks` · `payments` · `guests` · `events` 처럼 흔한 이름의 표를 만듭니다.
> 다른 서비스가 이미 쓰고 있는 프로젝트에 설치하면 이름이 겹쳐서 엉뚱한 표에 색인과 권한이 붙습니다.
> **결혼 준비 앱만 쓸 Supabase 프로젝트를 새로 만드세요.** 무료이고 1분이면 만듭니다.
>
> 지금 `setup.sql` 에는 안전장치가 들어 있어서, 겹치는 이름이 하나라도 있으면
> **아무것도 건드리지 않고** 아래 메시지를 내고 멈춥니다.
>
> ```
> ERROR: 이 Supabase 프로젝트에는 같은 이름의 표가 이미 있습니다: profiles, tasks, payments
> 아무것도 바꾸지 않고 멈췄습니다. 이 앱만 쓸 Supabase 프로젝트를 새로 만든 뒤 거기서 실행해 주세요.
> ```
>
> **이미 다른 프로젝트에서 실행해 오류가 났다면**: PostgreSQL 은 SQL Editor 로 보낸 스크립트를
> 하나의 트랜잭션으로 처리하므로, 중간에 오류가 나면 **전부 되돌립니다.** 보통은 아무것도 남지 않습니다.
> 그래도 확인하고 싶다면 `supabase/inspect.sql` 을 그 프로젝트에서 실행하세요. 읽기만 하고 아무것도 바꾸지 않습니다.
> 모두 `깨끗함` 으로 나오면 손댄 것이 없다는 뜻입니다. `남아있음` 이 있으면 `supabase/uninstall.sql` 로 지울 수 있습니다.

---

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 **New project** 를 누릅니다. 쓰던 프로젝트를 고르지 말고 반드시 새로 만듭니다.
2. 이름은 아무거나(예: `our-wedding`), Region 은 **Northeast Asia (Seoul)** 을 고릅니다.
3. Database Password 는 따로 적어 둡니다. 나중에 쓸 일은 거의 없습니다.
4. 프로젝트가 만들어질 때까지 1~2분 기다립니다.

## 2. 표(테이블) 만들기

왼쪽 메뉴에서 **SQL Editor → New query** 를 누르고, 저장소의 **`supabase/setup.sql` 파일 전체**를 붙여넣은 뒤 Run 합니다.
`Success. No rows returned` 이 나오면 끝입니다. 이 파일 하나에 아래 세 가지가 순서대로 들어 있습니다.

| 들어 있는 것 | 하는 일 |
| --- | --- |
| `0001_init.sql` | 테이블, 권한(RLS), 초대 코드 기능 |
| `0002_revision.sql` | 결혼 정보 보조 칸, 날짜 범위 안전장치 |
| `0003_realtime.sql` | 실시간 동기화 (삭제까지 전달되게) |

세 번째까지 들어가야 **상대가 지운 항목이 내 화면에서도 사라집니다.** 여러 번 실행해도 안전합니다.

> 파일이 안 보인다면 GitHub에서 브랜치를 **`claude/sharp-bardeen-efzcvf`** 로 바꿔 보세요. 이 저장소에는 아직 그 브랜치만 있습니다.
> 바로 열기: https://github.com/sanghohoho0813-lab/our-wedding-planner/blob/claude/sharp-bardeen-efzcvf/supabase/setup.sql
> 복사용 원본: https://raw.githubusercontent.com/sanghohoho0813-lab/our-wedding-planner/claude/sharp-bardeen-efzcvf/supabase/setup.sql

## 3. 열쇠 두 개 복사하기

**Project Settings → API** 에서 두 값을 복사합니다.

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`service_role` 키는 절대 쓰지 않습니다. 브라우저에 노출되면 안 되는 키입니다.

## 4. 환경변수 넣기

**Vercel 배포라면** Project → Settings → Environment Variables 에 두 개를 넣고 **Redeploy** 합니다.

**내 컴퓨터에서 돌린다면** 프로젝트 폴더에 `.env.local` 을 만듭니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_DEFAULT_WEDDING_DATE=2026-12-20
```

## 5. 로그인 주소 등록

**Authentication → URL Configuration** 에서

- Site URL: 배포 주소 (예: `https://our-wedding.vercel.app`)
- Redirect URLs: 위 주소 + `/auth/callback`

## 6. 신랑이 먼저 시작

1. 배포 주소로 들어가 **회원가입** 합니다.
2. 워크스페이스 만들기 화면에서 **"기존 결혼계획표 데이터 가져오기"를 켠 채로** 시작하기를 누릅니다. 원본 151건이 데이터베이스로 들어갑니다.
3. **설정 › 계정** 에서 **초대 링크 복사** 를 누릅니다.

## 7. 신부가 참여

1. 받은 초대 링크를 엽니다.
2. 회원가입을 합니다.
3. 초대 코드가 미리 채워진 화면에서 **참여하기** 를 누릅니다.

이제 둘 다 같은 데이터를 봅니다. 한 명이 할 일을 완료 처리하거나 금액을 고치면 상대 화면이 새로고침 없이 바뀝니다.

## 잘 되는지 확인하기

- 설정 › 계정 위쪽에 **실시간 연결됨** 이라고 초록 배지가 뜨면 정상입니다. 상단 프로필 옆 초록 점도 같은 뜻입니다.
- 두 기기를 나란히 놓고 한쪽에서 하객 한 명의 참석을 바꿔 보세요. 반대쪽 숫자가 바로 따라 움직여야 합니다.
- **연결 끊김** 이 뜨면 3번 SQL(`0003_realtime.sql`)을 실행했는지, 그리고 Database → Replication 에서 `supabase_realtime` 이 켜져 있는지 확인하세요.

## 알아두면 좋은 것

- 한 결혼 공간에는 **두 명까지** 참여할 수 있습니다.
- 권한(RLS)이 걸려 있어 같은 공간의 두 사람 외에는 아무도 데이터를 읽을 수 없습니다.
- 인터넷이 잠깐 끊겨도 화면은 그대로 쓸 수 있고, 저장은 다시 연결될 때 반영됩니다. 오래 끊겼다면 설정 › 계정의 **지금 새로 불러오기** 를 누르세요.
- 로컬 저장 모드에서 쓰던 기록이 있다면, 옮기기 전에 **설정 › 데이터 관리 › JSON 백업 내려받기** 를 하고, Supabase 로그인 후 같은 화면에서 복원하면 됩니다.
