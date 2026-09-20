-- =====================================================================
-- Our Wedding Planner — Supabase 설치 SQL (한 번에 실행용)
--
-- 이 파일은 scripts/build_setup_sql.py 가 supabase/migrations/ 를 이어 붙여 만듭니다.
-- 직접 고치지 말고 migrations 쪽을 고친 뒤 다시 생성하세요.
--
-- 쓰는 법
--   1) Supabase 대시보드 → SQL Editor → New query
--   2) 이 파일 전체를 붙여넣고 Run
--   3) "Success. No rows returned" 이 나오면 끝입니다.
--
-- 여러 번 실행해도 안전합니다(같은 걸 두 번 만들지 않습니다).
-- =====================================================================


-- ############### 0001_init.sql ###############

-- =====================================================================
-- Our Wedding Planner — initial schema
-- Supabase PostgreSQL. Run in the SQL editor or via `supabase db push`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 설치 전 안전장치
--
-- 이 앱은 public 스키마에 tasks · payments · guests · events 같은 흔한 이름의
-- 표를 만든다. 다른 서비스가 이미 쓰고 있는 프로젝트에 설치하면 이름이 겹쳐
-- 엉뚱한 표에 색인과 권한이 붙는다. 그래서 겹치는 이름이 하나라도 있으면
-- 아무것도 건드리지 않고 여기서 멈춘다.
--
-- 이 앱 전용 Supabase 프로젝트를 새로 만들어서 실행하세요.
-- (이미 이 앱이 깔린 프로젝트라면 이 검사는 건너뛴다 — 다시 실행해도 안전하다.)
-- ---------------------------------------------------------------------
do $$
declare
  clashing text[] := array[]::text[];
  t text;
  already_installed boolean;
  ours boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'weddings' and column_name = 'invite_code'
  ) into already_installed;

  if already_installed then
    return; -- 이 앱이 이미 설치된 프로젝트
  end if;

  -- 이 앱이 중간까지만 설치된 경우(파일을 일부만 붙여넣고 Run 한 경우)도 다시 이어서 실행할 수 있어야 한다.
  -- generate_invite_code 는 이 앱만 만드는 함수라 '우리가 만든 흔적'으로 쓴다.
  select exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('generate_invite_code', 'is_wedding_member')
  ) into ours;

  if ours then
    return; -- 앞부분만 실행된 상태. 이어서 나머지를 만든다.
  end if;

  foreach t in array array[
    'profiles','weddings','wedding_members','tasks','budget_categories','budget_items','payments',
    'vendors','venues','honeymoon','honeymoon_items','music_items','outfit_items','guests',
    'invitation_meetings','gifts','events','memos','activity_logs','attachments','user_settings'
  ] loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t) then
      clashing := clashing || t;
    end if;
  end loop;

  if array_length(clashing, 1) > 0 then
    raise exception E'이 Supabase 프로젝트에는 같은 이름의 표가 이미 있습니다: %\n\n'
      '결혼 준비 앱은 이 표들을 새로 만들어야 해서, 기존 프로젝트에 설치하면 원래 쓰던 데이터가 섞이거나 망가질 수 있습니다.\n'
      '아무것도 바꾸지 않고 멈췄습니다. 이 앱만 쓸 Supabase 프로젝트를 새로 만든 뒤 거기서 실행해 주세요.',
      array_to_string(clashing, ', ');
  end if;
end $$;

create extension if not exists "pgcrypto";

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.generate_invite_code()
returns text language sql volatile as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 다른 템플릿이 만든 profiles 가 이미 있을 수도 있다. 우리가 쓰는 칸만 채워 넣는다.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이 SQL 보다 먼저 가입한 사람(표가 없을 때 회원가입한 경우)도 프로필을 채워 둔다.
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;

-- ---------- weddings & members ----------
create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  name text not null default '우리의 결혼 준비',
  wedding_date date not null,
  wedding_time text,
  groom_name text not null default '',
  bride_name text not null default '',
  total_budget bigint not null default 0,
  invite_code text not null unique default public.generate_invite_code(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wedding_members (
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'partner' check (role in ('owner','partner')),
  created_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);
create index if not exists wedding_members_user_idx on public.wedding_members(user_id);

-- membership check (security definer avoids recursive RLS on wedding_members)
create or replace function public.is_wedding_member(w uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = w and m.user_id = auth.uid()
  );
$$;

-- ---------- domain tables ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null,
  category text,
  due_date date,
  status text not null default 'todo' check (status in ('todo','doing','waiting','done')),
  priority text not null default 'normal' check (priority in ('high','normal','low')),
  assignee text not null default 'both' check (assignee in ('groom','bride','both')),
  memo text,
  vendor_id uuid,
  budget_item_id uuid,
  is_favorite boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  icon text,
  sort_order integer not null default 0,
  planned_amount bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  category_id uuid references public.budget_categories(id) on delete set null,
  name text not null,
  estimated_amount bigint not null default 0,
  actual_amount bigint not null default 0,
  vendor_name text,
  vendor_id uuid,
  memo text,
  is_favorite boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  budget_item_id uuid not null references public.budget_items(id) on delete cascade,
  title text not null default '결제',
  amount bigint not null default 0,
  due_date date,
  paid boolean not null default false,
  paid_at date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  category text not null check (category in ('beauty','bouquet','photo','coordination','other')),
  name text not null,
  contact_name text,
  phone text,
  url text,
  reserved_date date,
  visit_date date,
  deposit bigint not null default 0,
  balance bigint not null default 0,
  total_amount bigint not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','deposit','paid')),
  status text not null default 'candidate' check (status in ('candidate','contracted','done')),
  memo text,
  is_favorite boolean not null default false,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  address text,
  event_date date,
  event_time text,
  is_contracted boolean not null default false,
  deposit bigint not null default 0,
  balance bigint not null default 0,
  hall_fee bigint not null default 0,
  meal_cost bigint not null default 0,
  guaranteed_guests integer not null default 0,
  expected_guests integer not null default 0,
  parking text,
  transport text,
  notes text,
  contact_name text,
  phone text,
  url text,
  memo text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.honeymoon (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null unique references public.weddings(id) on delete cascade,
  country text,
  city text,
  depart_date date,
  return_date date,
  flight_info text,
  flight_booked boolean not null default false,
  flight_booking_no text,
  hotel_name text,
  hotel_booked boolean not null default false,
  hotel_booking_no text,
  cost bigint not null default 0,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.honeymoon_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  kind text not null default 'checklist' check (kind in ('itinerary','checklist')),
  title text not null,
  date date,
  time text,
  done boolean not null default false,
  memo text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  slot text not null default 'other' check (slot in ('pre','groom_entry','bride_entry','parents_entry','song','march','other')),
  title text not null,
  artist text,
  url text,
  section text,
  is_confirmed boolean not null default false,
  memo text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outfit_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  kind text not null default '신랑 예복',
  vendor_name text,
  reserve_date date,
  fitting_date date,
  pickup_date date,
  cost bigint not null default 0,
  is_paid boolean not null default false,
  memo text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  side text not null default 'groom' check (side in ('groom','bride')),
  relation text,
  rsvp text not null default 'maybe' check (rsvp in ('yes','maybe','no')),
  companions integer not null default 0,
  meal text not null default 'unknown' check (meal in ('yes','no','unknown')),
  contacted boolean not null default false,
  invitation_sent boolean not null default false,
  invitation_method text check (invitation_method in ('mobile','paper','both')),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invitation_meetings (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null,
  target text,
  date date,
  time text,
  place text,
  attendees text,
  attendee_count integer not null default 0,
  estimated_cost bigint not null default 0,
  actual_cost bigint not null default 0,
  status text not null default 'planned' check (status in ('planned','done','canceled')),
  memo text,
  event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  recipient text not null,
  relation text,
  item text,
  estimated_cost bigint not null default 0,
  actual_cost bigint not null default 0,
  is_purchased boolean not null default false,
  is_delivered boolean not null default false,
  delivered_at date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null,
  type text not null default 'other',
  date date not null,
  start_time text,
  end_time text,
  location text,
  memo text,
  source_type text,
  source_id uuid,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  content text not null,
  converted_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null check (action in ('create','update','delete')),
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  accent text not null default 'rose' check (accent in ('rose','terracotta','sage','blue','gold')),
  font_scale numeric(3,2) not null default 1.00,
  updated_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index if not exists tasks_wedding_idx on public.tasks(wedding_id, due_date);
create index if not exists tasks_status_idx on public.tasks(wedding_id, status);
create index if not exists budget_categories_wedding_idx on public.budget_categories(wedding_id, sort_order);
create index if not exists budget_items_wedding_idx on public.budget_items(wedding_id, category_id);
create index if not exists payments_item_idx on public.payments(budget_item_id);
create index if not exists payments_wedding_due_idx on public.payments(wedding_id, paid, due_date);
create index if not exists vendors_wedding_idx on public.vendors(wedding_id, category);
create index if not exists venues_wedding_idx on public.venues(wedding_id);
create index if not exists honeymoon_items_wedding_idx on public.honeymoon_items(wedding_id, kind, sort_order);
create index if not exists music_items_wedding_idx on public.music_items(wedding_id, slot, sort_order);
create index if not exists outfit_items_wedding_idx on public.outfit_items(wedding_id);
create index if not exists guests_wedding_idx on public.guests(wedding_id, side);
create index if not exists guests_name_idx on public.guests(wedding_id, name);
create index if not exists invitation_meetings_wedding_idx on public.invitation_meetings(wedding_id, date);
create index if not exists gifts_wedding_idx on public.gifts(wedding_id);
create index if not exists events_wedding_date_idx on public.events(wedding_id, date);
create index if not exists memos_wedding_idx on public.memos(wedding_id, created_at desc);
create index if not exists activity_logs_wedding_idx on public.activity_logs(wedding_id, created_at desc);
create index if not exists attachments_entity_idx on public.attachments(wedding_id, entity_type, entity_id);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','weddings','tasks','budget_categories','budget_items','payments','vendors','venues',
    'honeymoon','honeymoon_items','music_items','outfit_items','guests','invitation_meetings','gifts',
    'events','memos','attachments','user_settings'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "profiles: self read" on public.profiles;
create policy "profiles: self read" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles for update using (auth.uid() = id);
drop policy if exists "profiles: self insert" on public.profiles;
create policy "profiles: self insert" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "weddings: members read" on public.weddings;
create policy "weddings: members read" on public.weddings for select using (public.is_wedding_member(id));
drop policy if exists "weddings: creator insert" on public.weddings;
create policy "weddings: creator insert" on public.weddings for insert with check (auth.uid() = created_by);
drop policy if exists "weddings: members update" on public.weddings;
create policy "weddings: members update" on public.weddings for update using (public.is_wedding_member(id));
drop policy if exists "weddings: creator delete" on public.weddings;
create policy "weddings: creator delete" on public.weddings for delete using (auth.uid() = created_by);

drop policy if exists "members: read own memberships" on public.wedding_members;
create policy "members: read own memberships" on public.wedding_members for select
  using (user_id = auth.uid() or public.is_wedding_member(wedding_id));
drop policy if exists "members: creator adds self" on public.wedding_members;
create policy "members: creator adds self" on public.wedding_members for insert
  with check (user_id = auth.uid() and exists (select 1 from public.weddings w where w.id = wedding_id and w.created_by = auth.uid()));
drop policy if exists "members: leave" on public.wedding_members;
create policy "members: leave" on public.wedding_members for delete using (user_id = auth.uid());

drop policy if exists "settings: self" on public.user_settings;
create policy "settings: self" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- generic per-wedding policies
do $$
declare t text;
begin
  foreach t in array array[
    'tasks','budget_categories','budget_items','payments','vendors','venues','honeymoon','honeymoon_items',
    'music_items','outfit_items','guests','invitation_meetings','gifts','events','memos','activity_logs','attachments'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: members select" on public.%I', t, t);
    execute format('create policy "%s: members select" on public.%I for select using (public.is_wedding_member(wedding_id))', t, t);
    execute format('drop policy if exists "%s: members insert" on public.%I', t, t);
    execute format('create policy "%s: members insert" on public.%I for insert with check (public.is_wedding_member(wedding_id))', t, t);
    execute format('drop policy if exists "%s: members update" on public.%I', t, t);
    execute format('create policy "%s: members update" on public.%I for update using (public.is_wedding_member(wedding_id)) with check (public.is_wedding_member(wedding_id))', t, t);
    execute format('drop policy if exists "%s: members delete" on public.%I', t, t);
    execute format('create policy "%s: members delete" on public.%I for delete using (public.is_wedding_member(wedding_id))', t, t);
  end loop;
end $$;

-- ---------- RPC: create wedding / join by invite code ----------
create or replace function public.create_wedding(
  p_name text, p_wedding_date date, p_groom_name text, p_bride_name text, p_total_budget bigint default 0
) returns uuid language plpgsql security definer set search_path = public as $$
declare wid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.weddings (name, wedding_date, groom_name, bride_name, total_budget, created_by)
  values (coalesce(nullif(p_name, ''), '우리의 결혼 준비'), p_wedding_date, coalesce(p_groom_name,''), coalesce(p_bride_name,''), coalesce(p_total_budget,0), auth.uid())
  returning id into wid;
  insert into public.wedding_members (wedding_id, user_id, role) values (wid, auth.uid(), 'owner');
  return wid;
end $$;

create or replace function public.join_wedding_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare wid uuid; cnt int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into wid from public.weddings where invite_code = upper(trim(p_code));
  if wid is null then raise exception 'invalid invite code'; end if;
  select count(*) into cnt from public.wedding_members where wedding_id = wid;
  if cnt >= 2 and not exists (select 1 from public.wedding_members where wedding_id = wid and user_id = auth.uid()) then
    raise exception 'wedding already has two members';
  end if;
  insert into public.wedding_members (wedding_id, user_id, role) values (wid, auth.uid(), 'partner')
  on conflict do nothing;
  return wid;
end $$;

-- ---------- storage bucket for attachments ----------
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "attachments: members read" on storage.objects;
create policy "attachments: members read" on storage.objects for select
  using (bucket_id = 'attachments' and public.is_wedding_member((storage.foldername(name))[1]::uuid));
drop policy if exists "attachments: members write" on storage.objects;
create policy "attachments: members write" on storage.objects for insert
  with check (bucket_id = 'attachments' and public.is_wedding_member((storage.foldername(name))[1]::uuid));
drop policy if exists "attachments: members delete" on storage.objects;
create policy "attachments: members delete" on storage.objects for delete
  using (bucket_id = 'attachments' and public.is_wedding_member((storage.foldername(name))[1]::uuid));

-- ---------- realtime ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table
      public.tasks, public.budget_categories, public.budget_items, public.payments, public.vendors, public.venues,
      public.honeymoon, public.honeymoon_items, public.music_items, public.outfit_items, public.guests,
      public.invitation_meetings, public.gifts, public.events, public.memos, public.activity_logs, public.weddings;
  end if;
exception when others then null;
end $$;

-- ############### 0002_revision.sql ###############

-- =====================================================================
-- Our Wedding Planner — revision 2
--  * weddings.details : 원본 시트의 부수 정보(부케 수, 헤어·메이크업 인원 등) 보관
--  * wedding_date 방어: 1970~2100 밖의 값이 들어오지 못하게 한다(1900-01-01 같은 fallback 차단)
-- =====================================================================

alter table public.weddings add column if not exists details jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'weddings_wedding_date_range') then
    alter table public.weddings
      add constraint weddings_wedding_date_range
      check (wedding_date between date '1970-01-01' and date '2100-01-01');
  end if;
end $$;

-- 이미 저장된 잘못된 날짜(예: 1900-01-01)는 사용자가 고칠 수 있도록 결혼식 기본값으로 올려둔다.
update public.weddings set wedding_date = date '2026-12-20'
where wedding_date < date '1970-01-01' or wedding_date > date '2100-01-01';

-- ############### 0003_realtime.sql ###############

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

-- ############### 0004_grants.sql ###############

-- =====================================================================
-- Our Wedding Planner — revision 4
-- 표 사용 권한을 명시적으로 준다.
--
-- Supabase 새 프로젝트에는 "앞으로 만들어지는 표에 자동으로 권한을 준다"는 설정이
-- 들어 있지만, 프로젝트나 SQL 을 실행한 롤에 따라 이 설정이 적용되지 않는 경우가 있다.
-- 그러면 로그인은 되는데 "permission denied for table wedding_members" 가 난다.
-- 자동 설정에 기대지 않고 이 앱이 만든 표에만 직접 권한을 준다.
--
-- 권한을 준다고 남의 데이터가 보이지는 않는다. 실제 접근 제어는 RLS 정책이 한다
-- (같은 결혼 공간의 두 사람만 자기 공간의 행을 읽고 쓸 수 있다).
-- =====================================================================

do $$
declare t text;
begin
  execute 'grant usage on schema public to anon, authenticated, service_role';

  foreach t in array array[
    'profiles','weddings','wedding_members','tasks','budget_categories','budget_items','payments',
    'vendors','venues','honeymoon','honeymoon_items','music_items','outfit_items','guests',
    'invitation_meetings','gifts','events','memos','activity_logs','attachments','user_settings'
  ] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role', t);
  end loop;
end $$;

-- 초대 · 공간 생성에 쓰는 함수
grant execute on function public.create_wedding(text, date, text, text, bigint) to authenticated;
grant execute on function public.join_wedding_by_code(text) to authenticated;
grant execute on function public.is_wedding_member(uuid) to authenticated;

notify pgrst, 'reload schema';

do $$
declare n int;
begin
  select count(*) into n
  from information_schema.role_table_grants
  where grantee = 'authenticated' and table_schema = 'public' and privilege_type = 'SELECT';
  raise notice '권한 설정 완료: 표 %개를 읽고 쓸 수 있습니다.', n;
end $$;

-- ############### 0005_guest_side_both.sql ###############

-- 하객 '공통 지인' 추가 (신랑 · 신부 둘 다 아는 사람)
--
-- 지금까지 하객은 신랑측 아니면 신부측 둘 중 하나였는데, 둘 다 아는 지인이 있어
-- 'both' 를 허용한다. 이 파일만 따로 돌려도 되고, 여러 번 돌려도 안전하다.
-- (0001~0004 를 이미 돌린 프로젝트에서 이것만 추가로 실행하면 된다)

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'guests') then
    raise exception '하객 표가 없습니다. 0001_init.sql 부터 먼저 실행해 주세요.';
  end if;
end $$;

-- 이름이 붙은 제약이든 자동 생성된 이름이든, side 를 검사하는 제약을 전부 찾아 떼어낸다
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'guests' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%side%'
  loop
    execute format('alter table public.guests drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.guests
  add constraint guests_side_check check (side in ('groom', 'bride', 'both'));

notify pgrst, 'reload schema';

do $$
declare n int;
begin
  select count(*) into n from public.guests where side = 'both';
  raise notice '완료: 하객 side 에 ''both''(공통 지인) 를 쓸 수 있습니다. 현재 공통 지인 %명.', n;
end $$;
