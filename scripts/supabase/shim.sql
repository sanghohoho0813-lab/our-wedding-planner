-- =====================================================================
-- Supabase 흉내내기 (로컬 PostgreSQL 검증 전용)
--
-- 실제 Supabase 프로젝트에는 auth · storage 스키마와 anon/authenticated 롤,
-- supabase_realtime publication 이 이미 있다. 로컬에서 setup.sql 을 그대로
-- 시험하려면 그 환경을 먼저 만들어 줘야 한다.
--
-- ⚠️ 이 파일은 Supabase 에서 절대 실행하지 않는다. 검증 스크립트 전용이다.
-- =====================================================================

create extension if not exists "pgcrypto";

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
-- Supabase 신규 프로젝트의 기본 권한: 앞으로 만들어지는 표에 자동으로 권한이 붙는다
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- ---------- auth ----------
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- ---------- storage ----------
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1 : greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to authenticated, service_role;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;

-- ---------- realtime ----------
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
