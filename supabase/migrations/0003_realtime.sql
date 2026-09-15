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
