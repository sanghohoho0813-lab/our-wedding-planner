# -*- coding: utf-8 -*-
"""supabase/migrations/*.sql 을 순서대로 이어 붙여 supabase/setup.sql 을 만든다.

Supabase SQL Editor 에 한 번만 붙여넣고 Run 하면 되도록 하기 위한 파일이다.
    python3 scripts/build_setup_sql.py
"""
import glob
import os

HEADER = """-- =====================================================================
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

"""

def main():
    files = sorted(glob.glob("supabase/migrations/*.sql"))
    if not files:
        raise SystemExit("supabase/migrations 에 sql 파일이 없습니다.")
    parts = [HEADER]
    for path in files:
        name = os.path.basename(path)
        parts.append(f"\n-- ############### {name} ###############\n\n")
        parts.append(open(path, encoding="utf-8").read().rstrip() + "\n")
    out = "".join(parts)
    with open("supabase/setup.sql", "w", encoding="utf-8") as f:
        f.write(out)
    print(f"supabase/setup.sql 생성 완료 — {len(files)}개 파일, {out.count(chr(10))}줄")
    for p in files:
        print(" -", p)


if __name__ == "__main__":
    main()
