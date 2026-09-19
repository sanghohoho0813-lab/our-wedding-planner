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
