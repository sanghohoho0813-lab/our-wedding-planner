-- =====================================================================
-- 이 Supabase 프로젝트에 결혼 준비 앱의 흔적이 남아 있는지 확인 (읽기 전용)
--
-- 다른 프로젝트에서 setup.sql 을 잘못 실행했을 때, 무언가 남았는지 보려고 쓴다.
-- 아무것도 바꾸지 않으니 마음 놓고 실행해도 된다.
--
-- SQL Editor 에 붙여넣고 Run → 아래 표가 나온다.
--   판정 = 깨끗함  → 이 프로젝트는 손대지 않았다. 그대로 두면 된다.
--   판정 = 남아있음 → supabase/uninstall.sql 로 지울 수 있다.
-- =====================================================================

with app_tables(name) as (
  values ('weddings'),('wedding_members'),('budget_categories'),('budget_items'),('vendors'),
         ('venues'),('honeymoon'),('honeymoon_items'),('music_items'),('outfit_items'),
         ('invitation_meetings'),('gifts'),('activity_logs'),('user_settings')
),
shared_names(name) as (
  values ('profiles'),('tasks'),('payments'),('guests'),('events'),('memos'),('attachments')
),
found_app as (
  select coalesce(string_agg(t.name, ', ' order by t.name), '') as v
  from app_tables t
  where exists (select 1 from information_schema.tables i where i.table_schema='public' and i.table_name=t.name)
),
found_shared as (
  select coalesce(string_agg(s.name || case when exists (
            select 1 from information_schema.columns c
            where c.table_schema='public' and c.table_name=s.name and c.column_name='wedding_id'
          ) then ' (결혼앱 형태)' else ' (원래 쓰던 표로 보임)' end, ', ' order by s.name), '') as v
  from shared_names s
  where exists (select 1 from information_schema.tables i where i.table_schema='public' and i.table_name=s.name)
),
trig as (
  select coalesce(string_agg(tgname, ', '), '') as v
  from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal
),
bucket as (
  select case when exists (select 1 from storage.buckets where id='attachments') then '있음' else '' end as v
),
fn as (
  select coalesce(string_agg(p.proname, ', ' order by p.proname), '') as v
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname='public' and p.proname in ('is_wedding_member','create_wedding','join_wedding_by_code','generate_invite_code','set_updated_at','handle_new_user')
)
select * from (
  select 1 as "순서", '결혼앱 전용 표' as "항목",
         case when (select v from found_app) = '' then '깨끗함' else '남아있음' end as "판정",
         coalesce(nullif((select v from found_app), ''), '없음') as "내용"
  union all
  select 2, '이름이 겹칠 수 있는 표',
         case when (select v from found_shared) like '%결혼앱 형태%' then '남아있음' else '깨끗함' end,
         coalesce(nullif((select v from found_shared), ''), '없음')
  union all
  select 3, '결혼앱 전용 함수',
         case when (select v from fn) = '' then '깨끗함' else '남아있음' end,
         coalesce(nullif((select v from fn), ''), '없음')
  union all
  select 4, 'auth.users 트리거',
         case when (select v from trig) like '%on_auth_user_created%' then '확인 필요' else '깨끗함' end,
         coalesce(nullif((select v from trig), ''), '없음')
  union all
  select 5, 'attachments 스토리지 버킷',
         case when (select v from bucket) = '' then '깨끗함' else '남아있음' end,
         coalesce(nullif((select v from bucket), ''), '없음')
) r order by "순서";
