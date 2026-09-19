-- =====================================================================
-- 스키마 계약 테스트
--
-- "앱이 실제로 저장하는 데이터"를 Supabase 스키마에 그대로 넣어본다.
-- 앱이 쓰는 칸이 표에 없거나, 타입 · 제약이 안 맞으면 여기서 걸린다.
-- (배포한 뒤 '저장에 실패했어요' 로 만나는 것보다 훨씬 싸다.)
--
-- 앞서 verify.sql 이 만든 세션 컨텍스트(pg_temp.ctx, 신랑 계정)를 이어 쓴다.
-- 입력: pg_temp.app_data(doc jsonb) — qa/dump-data.mjs 결과
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 앱이 쓰는 칸이 표에 다 있는지 (칸 누락 = 배포 후 저장 실패)
-- ---------------------------------------------------------------------
do $$
declare
  doc jsonb; t text; missing text[]; all_missing text[] := array[]::text[]; checked int := 0;
begin
  select app_data.doc into doc from pg_temp.app_data;

  for t in select jsonb_array_elements_text(doc->'__tables') loop
    continue when jsonb_typeof(doc->t) <> 'array' or jsonb_array_length(doc->t) = 0;
    checked := checked + 1;
    select array_agg(k) into missing
    from (select jsonb_object_keys(doc->t->0) as k) keys
    where not exists (
      select 1 from information_schema.columns c
      where c.table_schema='public' and c.table_name=t and c.column_name = keys.k
    );
    if missing is not null then
      all_missing := all_missing || (t || ': ' || array_to_string(missing, ', '));
    end if;
  end loop;

  perform pg_temp.ok(all_missing = array[]::text[],
    '앱이 저장하는 칸이 표에 모두 있음(' || checked || '개 표 대조)',
    coalesce(array_to_string(all_missing, ' / '), ''));

  -- 결혼 기본 정보에서 앱이 직접 고치는 칸
  select array_agg(k) into missing
  from unnest(array['name','wedding_date','wedding_time','groom_name','bride_name','total_budget','details']) k
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema='public' and c.table_name='weddings' and c.column_name = k
  );
  perform pg_temp.ok(missing is null, '결혼 기본 정보 칸이 모두 있음', coalesce(array_to_string(missing, ', '), ''));
end $$;

-- ---------------------------------------------------------------------
-- 2. 신랑 계정으로 실제 데이터 전부 넣기 (RLS 적용 상태)
-- ---------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

do $$
declare
  doc jsonb; wid uuid := pg_temp.get('wid')::uuid; t text; rows jsonb; n int; total int := 0;
  uid uuid := '11111111-1111-4111-8111-111111111111';
  cols text; bad text[] := array[]::text[];
begin
  select app_data.doc into doc from pg_temp.app_data;

  -- 결혼 기본 정보: 앱의 '이사'와 같은 방식으로 값만 옮긴다
  update public.weddings set
    name = doc->'wedding'->>'name',
    wedding_date = (doc->'wedding'->>'wedding_date')::date,
    wedding_time = doc->'wedding'->>'wedding_time',
    groom_name = coalesce(doc->'wedding'->>'groom_name', ''),
    bride_name = coalesce(doc->'wedding'->>'bride_name', ''),
    total_budget = (doc->'wedding'->>'total_budget')::bigint,
    details = coalesce(doc->'wedding'->'details', '{}'::jsonb)
  where id = wid;

  -- 앱이 넣는 순서 그대로 넣는다. 외래키(예산 카테고리 → 항목 → 결제)가 있어 순서가 틀리면 여기서 깨진다.
  for t in select jsonb_array_elements_text(doc->'__tables') loop
    continue when jsonb_typeof(doc->t) <> 'array' or jsonb_array_length(doc->t) = 0;

    -- 한 표 안의 모든 행이 같은 칸을 보내야 한다(PostgREST 는 배열 삽입 때 칸 목록을 하나로 본다)
    if exists (
      select 1 from jsonb_array_elements(doc->t) r
      where (select array_agg(k order by k) from jsonb_object_keys(r) k)
         <> (select array_agg(k order by k) from jsonb_object_keys(doc->t->0) k)
    ) then
      bad := bad || t;
    end if;

    -- wedding_id 는 새 공간으로, activity_logs.user_id 는 로그인한 사람으로 바꿔 넣는다
    select jsonb_agg(
      case when t = 'activity_logs'
        then r || jsonb_build_object('wedding_id', wid, 'user_id', uid)
        else r || jsonb_build_object('wedding_id', wid) end)
    into rows from jsonb_array_elements(doc->t) r;

    -- 앱이 보내는 칸만 넣는다. 나머지는 표의 기본값이 채운다(PostgREST 와 같은 동작).
    select string_agg(format('%I', k), ', ') into cols from jsonb_object_keys(rows->0) k;
    execute format(
      'insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1)',
      t, cols, cols, t) using rows;

    execute format('select count(*) from public.%I where wedding_id = $1', t) into n using wid;
    if n <> jsonb_array_length(doc->t) then
      raise exception 'FAIL %: 넣은 건수가 다릅니다 (원본 %, 저장 %)', t, jsonb_array_length(doc->t), n;
    end if;
    total := total + n;
  end loop;

  perform pg_temp.ok(bad = array[]::text[], '한 표의 모든 행이 같은 칸을 보냄(묶음 저장 안전)',
    coalesce(array_to_string(bad, ', '), ''));
  -- 원본 이관 151건 + 앱이 남긴 활동 기록
  perform pg_temp.ok(
    total - jsonb_array_length(coalesce(doc->'activity_logs', '[]'::jsonb)) = 151,
    '원본 151건이 앱이 넣는 순서 그대로 저장됨(외래키 순서 포함)', total || '건 저장');
  perform pg_temp.put('total', total::text);
end $$;

-- 앱이 안 보내는 칸은 표의 기본값이 제대로 채웠는지 (NOT NULL 사고 방지)
do $$
declare wid uuid := pg_temp.get('wid')::uuid; n int;
begin
  select count(*) into n from public.tasks where wedding_id = wid and is_favorite is null;
  perform pg_temp.ok(n = 0, '앱이 안 보내는 칸은 표의 기본값으로 채워짐', n || '건 비어 있음');
end $$;

do $$
declare wid uuid := pg_temp.get('wid')::uuid; s bigint; w record;
begin
  select sum(actual_amount) into s from public.budget_items where wedding_id = wid;
  perform pg_temp.ok(s = 10411800, '실제 지출 합계가 원본과 같음', to_char(s, 'FM999,999,999') || '원');

  select * into w from public.weddings where id = wid;
  perform pg_temp.ok(w.wedding_date = date '2026-12-20' and w.wedding_time = '13:00',
    '결혼식 2026-12-20 13:00 저장', w.wedding_date::text || ' ' || w.wedding_time);
  perform pg_temp.ok(w.details->'roles'->>'mc' = '강래원 오빠', '당일 역할(사회) 보존', w.details->'roles'->>'mc');
  perform pg_temp.ok((select count(*) from public.guests where wedding_id = wid) = 43, '하객 43명');
end $$;

-- ---------------------------------------------------------------------
-- 3. 신부가 같은 데이터를 보고 고칠 수 있는지
-- ---------------------------------------------------------------------
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

do $$
declare wid uuid := pg_temp.get('wid')::uuid; n int; gid uuid; tid uuid;
begin
  select count(*) into n from public.guests where wedding_id = wid;
  perform pg_temp.ok(n = 43, '신부도 같은 하객 43명을 봄', n || '명');

  select id into gid from public.guests where wedding_id = wid order by name limit 1;
  update public.guests set rsvp = 'yes', invitation_sent = true where id = gid;
  perform pg_temp.ok(
    (select rsvp from public.guests where id = gid) = 'yes', '신부가 하객 참석을 고칠 수 있음');
  perform pg_temp.put('gid', gid::text);

  select id into tid from public.tasks where wedding_id = wid order by title limit 1;
  delete from public.tasks where id = tid;
  perform pg_temp.ok((select count(*) from public.tasks where wedding_id = wid) = 27,
    '신부가 할 일을 지울 수 있음');

  insert into public.memos (wedding_id, content) values (wid, '신부가 남긴 메모');
  perform pg_temp.ok((select count(*) from public.memos where wedding_id = wid) = 2, '신부가 메모를 추가할 수 있음');
end $$;

-- 신랑 쪽에서도 같은 결과가 보인다 (같은 데이터베이스를 보므로 실시간 이전에 이미 참)
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$
declare wid uuid := pg_temp.get('wid')::uuid;
begin
  perform pg_temp.ok(
    (select rsvp from public.guests where id = pg_temp.get('gid')::uuid) = 'yes',
    '신랑 쪽에서도 신부의 수정이 보임');
  perform pg_temp.ok((select count(*) from public.tasks where wedding_id = wid) = 27,
    '신랑 쪽에서도 지워진 할 일이 사라짐');
end $$;

-- ---------------------------------------------------------------------
-- 4. 제3자는 여전히 아무것도 못 본다
-- ---------------------------------------------------------------------
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
do $$
declare n int;
begin
  select count(*) into n from public.guests;
  perform pg_temp.ok(n = 0, '제3자에게는 하객이 한 명도 안 보임', n || '명');
  select count(*) into n from public.budget_items;
  perform pg_temp.ok(n = 0, '제3자에게는 예산이 안 보임', n || '건');

  begin
    insert into public.memos (wedding_id, content) values (pg_temp.get('wid')::uuid, '침입');
    perform pg_temp.ok(false, '제3자는 남의 공간에 쓸 수 없음');
  exception when insufficient_privilege then
    perform pg_temp.ok(true, '제3자는 남의 공간에 쓸 수 없음');
  end;
end $$;

-- ---------------------------------------------------------------------
-- 5. 공간을 지우면 딸린 기록도 함께 지워진다
-- ---------------------------------------------------------------------
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$
declare wid uuid := pg_temp.get('wid')::uuid; n int;
begin
  delete from public.weddings where id = wid;
  select count(*) into n from public.guests;
  perform pg_temp.ok(n = 0, '공간을 지우면 하객 기록도 함께 정리됨(cascade)', n || '명');
end $$;

reset role;
reset request.jwt.claim.sub;
