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
update public.weddings set wedding_date = date '2026-12-21'
where wedding_date < date '1970-01-01' or wedding_date > date '2100-01-01';
