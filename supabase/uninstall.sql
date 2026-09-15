-- =====================================================================
-- 결혼 준비 앱이 만든 것만 골라서 지운다 (다른 프로젝트에 잘못 설치했을 때)
--
-- 먼저 supabase/inspect.sql 을 돌려 '남아있음' 이 있는지 확인하세요.
-- 전부 '깨끗함' 이면 이 파일은 실행할 필요가 없습니다.
--
-- 안전 규칙
--  * 결혼앱 전용 표(weddings, budget_items …)만 지운다.
--  * tasks · payments · guests 처럼 이름이 겹칠 수 있는 표는
--    wedding_id 칸이 있는 경우(= 결혼앱이 만든 표)만 지운다.
--  * profiles 는 어떤 경우에도 지우지 않는다. 원래 쓰던 표일 가능성이 커서
--    직접 확인하시라고 안내만 남긴다.
--  * set_updated_at / handle_new_user 함수도 흔한 이름이라 남겨둔다.
-- =====================================================================

do $$
declare
  t text;
  dropped text[] := array[]::text[];
  kept text[] := array[]::text[];
begin
  -- 1) 결혼앱 전용 표
  foreach t in array array[
    'attachments','activity_logs','payments','budget_items','budget_categories','invitation_meetings',
    'gifts','guests','music_items','outfit_items','honeymoon_items','honeymoon','vendors','venues',
    'events','memos','tasks','wedding_members','user_settings','weddings'
  ] loop
    if not exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      continue;
    end if;

    -- 이름이 겹칠 수 있는 표는 결혼앱 서명(wedding_id)이 있을 때만 지운다
    if t in ('tasks','payments','guests','events','memos','attachments')
       and not exists (
         select 1 from information_schema.columns
         where table_schema='public' and table_name=t and column_name='wedding_id'
       ) then
      kept := kept || t;
      continue;
    end if;

    execute format('drop table public.%I cascade', t);
    dropped := dropped || t;
  end loop;

  -- 2) 결혼앱 전용 함수
  foreach t in array array['is_wedding_member','create_wedding','join_wedding_by_code','generate_invite_code'] loop
    if exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=t
    ) then
      execute format('drop function if exists public.%I cascade', t);
      dropped := dropped || (t || '()');
    end if;
  end loop;

  raise notice '지운 것: %', coalesce(array_to_string(dropped, ', '), '없음');
  if array_length(kept, 1) > 0 then
    raise notice '원래 쓰던 표로 보여 그대로 둔 것: %', array_to_string(kept, ', ');
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    raise notice 'profiles 는 지우지 않았습니다. 원래 쓰던 표인지 직접 확인해 주세요.';
  end if;
end $$;

-- 3) 스토리지: 결혼앱이 만든 정책과 빈 버킷만 정리
drop policy if exists "attachments: members read" on storage.objects;
drop policy if exists "attachments: members write" on storage.objects;
drop policy if exists "attachments: members delete" on storage.objects;

do $$
begin
  if exists (select 1 from storage.buckets where id='attachments')
     and not exists (select 1 from storage.objects where bucket_id='attachments') then
    delete from storage.buckets where id='attachments';
    raise notice 'attachments 버킷을 지웠습니다(비어 있었음).';
  elsif exists (select 1 from storage.buckets where id='attachments') then
    raise notice 'attachments 버킷에 파일이 있어 그대로 두었습니다.';
  end if;
end $$;

-- 4) auth.users 트리거는 자동으로 건드리지 않는다.
--    원래 다른 트리거를 쓰고 있었다면 setup.sql 이 덮어썼을 수 있으니 직접 확인하세요.
--    확인:  select tgname from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal;
--    이 앱만 쓰던 것이면:  drop trigger if exists on_auth_user_created on auth.users;
