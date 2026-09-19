#!/usr/bin/env bash
# =====================================================================
# supabase/setup.sql 을 진짜 PostgreSQL 에 설치해 보고, 신랑·신부 두 사람
# 시나리오를 끝까지 돌려보는 검증기.
#
#   bash scripts/verify_supabase_sql.sh [wedding-data.json]
#
# 인자로 앱 데이터(JSON)를 주면 "앱이 저장하는 151건"을 실제 스키마에 넣어
# 칸 · 타입 · 외래키 순서까지 대조한다. 안 주면 스키마와 권한만 본다.
#   BASE=http://localhost:3001 node qa/dump-data.mjs /tmp/wedding-data.json
#
# 필요한 것: postgresql-16 (psql, initdb, pg_ctl)
# =====================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PGDIR="${OWP_PGDIR:-/var/lib/postgresql/owp-verify}"
PORT="${OWP_PGPORT:-55432}"
DATA_JSON="${1:-}"
export PGHOST=/tmp PGPORT="$PORT" PGUSER=postgres

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
pass() { printf 'PASS %s\n' "$*"; }
fail() { printf 'FAIL %s\n' "$*"; exit 1; }

# ---------- 임시 서버 ----------
if ! "$PGBIN/pg_isready" -q 2>/dev/null; then
  say "임시 PostgreSQL 서버를 띄웁니다 ($PGDIR)"
  # PGDIR 에는 입력으로 받은 JSON 이 놓여 있을 수 있으므로 데이터 디렉터리만 지운다
  rm -rf "$PGDIR/data" "$PGDIR/server.log"; mkdir -p "$PGDIR"; chown postgres:postgres "$PGDIR"
  su postgres -c "$PGBIN/initdb -D $PGDIR/data -U postgres -A trust --locale=C.UTF-8 --encoding=UTF8" >/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $PGDIR/data -l $PGDIR/server.log -o '-k /tmp -p $PORT -c wal_level=logical' start" >/dev/null
  sleep 2
  STARTED_HERE=1
fi
"$PGBIN/pg_isready" -q || fail "PostgreSQL 에 연결할 수 없습니다."

psqlq() { "$PGBIN/psql" -v ON_ERROR_STOP=1 -q "$@"; }
fresh_db() {
  psqlq -d postgres -c "drop database if exists $1" >/dev/null
  psqlq -d postgres -c "create database $1" >/dev/null
  psqlq -d "$1" -f "$ROOT/scripts/supabase/shim.sql" >/dev/null 2>&1
}

# ---------------------------------------------------------------------
say "1) 새 Supabase 프로젝트에 설치 + 두 사람 시나리오"
# ---------------------------------------------------------------------
fresh_db owp_fresh
psqlq -d owp_fresh -f "$ROOT/supabase/setup.sql" >/dev/null 2>&1 || fail "setup.sql 설치 실패"
pass "setup.sql 설치 완료"

DRIVER="$(mktemp /tmp/owp-driver-XXXX.sql)"
printf '\\i %s/scripts/supabase/verify.sql\n' "$ROOT" > "$DRIVER"
if [ -n "$DATA_JSON" ] && [ -f "$DATA_JSON" ]; then
  LOADER="$(mktemp /tmp/owp-load-XXXX.sql)"
  printf 'create table pg_temp.app_data(doc jsonb);\ninsert into pg_temp.app_data values ($owp$%s$owp$::jsonb);\ngrant select on pg_temp.app_data to public;\n' "$(cat "$DATA_JSON")" > "$LOADER"
  printf '\\i %s\n\\i %s/scripts/supabase/contract.sql\n' "$LOADER" "$ROOT" >> "$DRIVER"
fi
"$PGBIN/psql" -v ON_ERROR_STOP=1 -q -d owp_fresh -f "$DRIVER" 2>&1 | sed -E 's/^psql:[^ ]*: NOTICE:  //' | grep -v '^$' || fail "시나리오 검증 실패"

# ---------------------------------------------------------------------
say "2) 여러 번 실행해도 안전한가"
# ---------------------------------------------------------------------
psqlq -d owp_fresh -f "$ROOT/supabase/setup.sql" >/dev/null 2>&1 || fail "두 번째 실행에서 오류"
N=$("$PGBIN/psql" -At -d owp_fresh -c "select count(*) from information_schema.tables where table_schema='public'")
[ "$N" = "21" ] && pass "두 번 실행해도 표는 21개 그대로" || fail "표 개수가 달라졌습니다 ($N)"

# ---------------------------------------------------------------------
say "3) 파일을 일부만 붙여넣고 Run 했다가 다시 전체를 실행하면"
# ---------------------------------------------------------------------
fresh_db owp_partial
CUT="$(grep -n 'drop trigger if exists on_auth_user_created' "$ROOT/supabase/setup.sql" | head -1 | cut -d: -f1)"
PART="$(mktemp /tmp/owp-part-XXXX.sql)"
head -n "$CUT" "$ROOT/supabase/setup.sql" > "$PART"
psqlq -d owp_partial -f "$PART" >/dev/null 2>&1 || fail "앞부분 실행부터 실패"
HAS_P="$("$PGBIN/psql" -At -d owp_partial -c "select count(*) from information_schema.tables where table_schema='public' and table_name='profiles'")"
[ "$HAS_P" = "1" ] && pass "앞부분만 실행되면 profiles 까지 만들어짐(사용자가 겪은 상태)" || fail "앞부분 실행 결과가 예상과 다름"
psqlq -d owp_partial -f "$ROOT/supabase/setup.sql" >/dev/null 2>&1 || fail "이어서 전체를 실행하지 못함(안전장치에 막힘)"
N="$("$PGBIN/psql" -At -d owp_partial -c "select count(*) from information_schema.tables where table_schema='public'")"
[ "$N" = "21" ] && pass "이어서 전체를 실행하면 표 21개가 완성됨" || fail "표가 $N 개만 있습니다"
rm -f "$PART"

# ---------------------------------------------------------------------
say "4) 표 권한이 자동으로 붙지 않는 프로젝트에서도 되는가"
# ---------------------------------------------------------------------
# 일부 프로젝트는 "앞으로 만들 표에 자동으로 권한" 설정이 적용되지 않는다.
# 그 상태를 만들어 두고 설치해, 로그인한 사람이 실제로 읽고 쓸 수 있는지 본다.
fresh_db owp_nogrant
psqlq -d owp_nogrant -c "alter default privileges in schema public revoke all on tables from anon, authenticated, service_role" >/dev/null
psqlq -d owp_nogrant -f "$ROOT/supabase/setup.sql" >/dev/null 2>&1 || fail "권한 없는 프로젝트에서 설치 실패"
CAN="$("$PGBIN/psql" -At -d owp_nogrant -c "select case when has_table_privilege('authenticated','public.wedding_members','select') and has_table_privilege('authenticated','public.guests','insert') then 'yes' else 'no' end")"
[ "$CAN" = "yes" ] && pass "설치만 하면 로그인한 사람이 표를 읽고 쓸 수 있음" || fail "권한이 없습니다 (permission denied 가 납니다)"
psqlq -d postgres -c "drop database if exists owp_nogrant" >/dev/null

# ---------------------------------------------------------------------
say "5) 쓰던 프로젝트에 잘못 설치하면 멈추는가"
# ---------------------------------------------------------------------
fresh_db owp_dirty
psqlq -d owp_dirty -c "create table public.payments(id serial primary key, memo text); insert into public.payments(memo) values ('원래 쓰던 데이터')" >/dev/null
ERR="$("$PGBIN/psql" -v ON_ERROR_STOP=1 -q -d owp_dirty -f "$ROOT/supabase/setup.sql" 2>&1 >/dev/null || true)"
echo "$ERR" | grep -q "같은 이름의 표가 이미 있습니다" || fail "안전장치가 동작하지 않았습니다"
pass "겹치는 표를 발견하고 한국어로 멈춤"
KEPT="$("$PGBIN/psql" -At -d owp_dirty -c "select count(*) from public.payments")"
MADE="$("$PGBIN/psql" -At -d owp_dirty -c "select count(*) from information_schema.tables where table_schema='public' and table_name='weddings'")"
[ "$KEPT" = "1" ] && pass "원래 있던 데이터는 그대로" || fail "원래 데이터가 사라졌습니다"
[ "$MADE" = "0" ] && pass "아무 표도 만들지 않고 전부 되돌림" || fail "표가 만들어졌습니다"

# ---------------------------------------------------------------------
say "6) 지우기(uninstall)가 남의 표를 건드리지 않는가"
# ---------------------------------------------------------------------
psqlq -d owp_fresh -c "create table public.my_other_app(id int)" >/dev/null
psqlq -d owp_fresh -f "$ROOT/supabase/uninstall.sql" >/dev/null 2>&1 || fail "uninstall.sql 실패"
LEFT="$("$PGBIN/psql" -At -d owp_fresh -c "select count(*) from information_schema.tables where table_schema='public' and table_name in ('weddings','tasks','guests','budget_items')")"
OTHER="$("$PGBIN/psql" -At -d owp_fresh -c "select count(*) from information_schema.tables where table_schema='public' and table_name='my_other_app'")"
[ "$LEFT" = "0" ] && pass "앱 표는 모두 정리됨" || fail "앱 표가 남았습니다 ($LEFT)"
[ "$OTHER" = "1" ] && pass "다른 앱의 표는 건드리지 않음" || fail "남의 표를 지웠습니다"

# ---------------------------------------------------------------------
psqlq -d postgres -c "drop database if exists owp_fresh" >/dev/null
psqlq -d postgres -c "drop database if exists owp_dirty" >/dev/null
psqlq -d postgres -c "drop database if exists owp_partial" >/dev/null
rm -f "$DRIVER" "${LOADER:-}"
if [ "${STARTED_HERE:-0}" = "1" ]; then
  su postgres -c "$PGBIN/pg_ctl -D $PGDIR/data stop" >/dev/null 2>&1 || true
fi
say "전부 통과했습니다."
