-- =====================================================================
-- Our Wedding Planner — revision 3
-- 두 사람이 동시에 쓸 때 실시간 동기화가 빠짐없이 도착하도록 만든다.
--
-- Postgres 는 기본적으로 DELETE 이벤트에 기본키만 담아 보낸다.
-- 그러면 Realtime 의 wedding_id 필터가 걸리지 않아 '상대가 지운 항목'이
-- 내 화면에서 사라지지 않는다. REPLICA IDENTITY FULL 로 이전 행 전체를 싣는다.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'tasks','budget_categories','budget_items','payments','vendors','venues','honeymoon','honeymoon_items',
    'music_items','outfit_items','guests','invitation_meetings','gifts','events','memos','activity_logs','attachments'
  ] loop
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;

-- 0001 이후에 만들어진 테이블이 있어도 publication 에 빠지지 않게 다시 확인한다.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array[
      'tasks','budget_categories','budget_items','payments','vendors','venues','honeymoon','honeymoon_items',
      'music_items','outfit_items','guests','invitation_meetings','gifts','events','memos','activity_logs','weddings'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- =====================================================================
-- 설치 확인
-- 파일을 끝까지 붙여넣고 Run 했는지 여기서 알려준다.
-- (일부만 붙여넣으면 이 검사까지 오지 못하므로, 이 메시지가 보이면 끝까지 실행된 것이다.)
-- =====================================================================
do $$
declare n int;
begin
  select count(*) into n from information_schema.tables
  where table_schema = 'public' and table_name in (
    'profiles','weddings','wedding_members','tasks','budget_categories','budget_items','payments',
    'vendors','venues','honeymoon','honeymoon_items','music_items','outfit_items','guests',
    'invitation_meetings','gifts','events','memos','activity_logs','attachments','user_settings');

  if n < 21 then
    raise exception E'설치가 끝나지 않았습니다. 표가 %개만 만들어졌습니다.\n\n'
      'setup.sql 파일을 처음부터 끝까지 전부 붙여넣었는지 확인한 뒤 다시 Run 해주세요.', n;
  end if;

  -- PostgREST 가 새 표를 바로 알아보도록 스키마 캐시를 깨운다
  notify pgrst, 'reload schema';
  raise notice '설치 완료: 표 %개가 준비되었습니다. 앱으로 돌아가 다시 시도를 누르세요.', n;
end $$;
