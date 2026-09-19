-- =====================================================================
-- setup.sql 검증 — 신랑 · 신부 두 사람 시나리오를 실제로 돌려본다.
-- 로컬 PostgreSQL + scripts/supabase/shim.sql 환경 전용.
-- 실패하면 즉시 예외를 던지므로 psql -v ON_ERROR_STOP=1 로 실행한다.
-- =====================================================================
\set QUIET on
\pset pager off

create or replace function pg_temp.ok(cond boolean, label text, info text default '') returns void
language plpgsql as $$
begin
  if cond then raise notice 'PASS %', label || case when info <> '' then ' — ' || info else '' end;
  else raise exception 'FAIL %', label || case when info <> '' then ' — ' || info else '' end;
  end if;
end $$;

-- 시나리오 중간값 보관. 롤을 바꿔가며 쓰므로 security definer 로 둔다.
create table if not exists pg_temp.ctx(k text primary key, v text);
create or replace function pg_temp.put(k text, v text) returns void language sql security definer as $$
  insert into pg_temp.ctx values (k, v) on conflict (k) do update set v = excluded.v;
$$;
create or replace function pg_temp.get(k text) returns text language sql stable security definer as $$
  select v from pg_temp.ctx where ctx.k = get.k;
$$;

-- ---------------------------------------------------------------------
-- 1. 설치 결과
-- ---------------------------------------------------------------------
do $$
declare n int; app_tables text[] := array[
  'profiles','weddings','wedding_members','tasks','budget_categories','budget_items','payments',
  'vendors','venues','honeymoon','honeymoon_items','music_items','outfit_items','guests',
  'invitation_meetings','gifts','events','memos','activity_logs','attachments','user_settings'];
begin
  select count(*) into n from information_schema.tables
    where table_schema='public' and table_name = any(app_tables);
  perform pg_temp.ok(n = 21, '표 21개 생성', n || '개');

  select count(*) into n from pg_tables t
    where schemaname='public' and tablename = any(app_tables) and not rowsecurity;
  perform pg_temp.ok(n = 0, '모든 표에 RLS 켜짐', n || '개 누락');

  select count(*) into n from pg_policies where schemaname='public';
  perform pg_temp.ok(n >= 75, '행 수준 보안 정책 생성', n || '개');

  select count(*) into n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
    where ns.nspname='public' and c.relreplident='f' and c.relname = any(app_tables);
  perform pg_temp.ok(n = 17, '삭제까지 실시간 전달(REPLICA IDENTITY FULL)', n || '개');

  select count(*) into n from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public';
  perform pg_temp.ok(n = 17, '실시간 publication 등록(16개 표 + weddings)', n || '개');
  perform pg_temp.ok(exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='weddings'),
    '결혼 기본 정보도 실시간 대상');

  perform pg_temp.ok(exists(select 1 from storage.buckets where id='attachments'), '첨부 파일 버킷 생성');
  perform pg_temp.ok(exists(select 1 from pg_constraint where conname='weddings_wedding_date_range'),
    '결혼식 날짜 범위 제약(1970~2100) 존재');
end $$;

-- ---------------------------------------------------------------------
-- 2. 신랑 가입 → 공간 만들기
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'groom@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'bride@example.com'),
  ('33333333-3333-4333-8333-333333333333', 'other@example.com');

do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  perform pg_temp.ok(n = 3, '회원가입하면 프로필이 자동 생성됨(트리거)', n || '명');
end $$;

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

do $$
declare wid uuid; n int; code text;
begin
  wid := public.create_wedding('우리의 결혼 준비', date '2026-12-20', '상호', '신부', 15000000);
  perform pg_temp.put('wid', wid::text);
  select count(*) into n from public.wedding_members where wedding_id = wid;
  perform pg_temp.ok(n = 1, '신랑이 결혼 공간을 만들고 멤버가 됨', n || '명');
  select invite_code into code from public.weddings where id = wid;
  perform pg_temp.put('code', code);
  perform pg_temp.ok(code ~ '^[0-9A-F]{8}$', '초대 코드 자동 생성', code);

  update public.weddings set wedding_time = '13:00', details = '{"roles":{"mc":"강래원 오빠"}}'::jsonb where id = wid;
  perform pg_temp.ok(
    (select wedding_time from public.weddings where id = wid) = '13:00', '결혼 정보 수정 가능');

  begin
    update public.weddings set wedding_date = date '1900-01-01' where id = wid;
    perform pg_temp.ok(false, '1900-01-01 같은 잘못된 날짜 차단');
  exception when check_violation then
    perform pg_temp.ok(true, '1900-01-01 같은 잘못된 날짜 차단');
  end;
end $$;

-- ---------------------------------------------------------------------
-- 3. 신부: 참여 전에는 아무것도 못 본다 → 초대 코드로 참여
-- ---------------------------------------------------------------------
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

do $$
declare n int;
begin
  select count(*) into n from public.weddings;
  perform pg_temp.ok(n = 0, '참여 전에는 남의 결혼 공간이 보이지 않음(RLS)', n || '건');

  perform public.join_wedding_by_code(pg_temp.get('code'));
  select count(*) into n from public.weddings;
  perform pg_temp.ok(n = 1, '초대 코드로 참여하면 같은 공간이 보임', n || '건');

  begin
    perform public.join_wedding_by_code('ZZZZZZZZ');
    perform pg_temp.ok(false, '없는 초대 코드는 거절');
  exception when others then
    perform pg_temp.ok(sqlerrm like '%invalid invite code%', '없는 초대 코드는 거절', sqlerrm);
  end;
end $$;

-- ---------------------------------------------------------------------
-- 4. 제3자는 들어올 수 없다 (최대 2명)
-- ---------------------------------------------------------------------
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

do $$
declare n int;
begin
  begin
    perform public.join_wedding_by_code(pg_temp.get('code'));
    perform pg_temp.ok(false, '세 번째 사람은 참여 거절(최대 2명)');
  exception when others then
    perform pg_temp.ok(sqlerrm like '%two members%', '세 번째 사람은 참여 거절(최대 2명)', sqlerrm);
  end;

  select count(*) into n from public.weddings;
  perform pg_temp.ok(n = 0, '남은 제3자에게는 결혼 정보가 안 보임', n || '건');
end $$;

reset role;
reset request.jwt.claim.sub;
