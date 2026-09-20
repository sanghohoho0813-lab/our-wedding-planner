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
