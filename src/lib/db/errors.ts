"use client";
import { SUPABASE_HOST } from "@/lib/config";

/**
 * 데이터베이스가 돌려주는 영문 오류를, 무엇을 하면 되는지 아는 말로 바꾼다.
 * 이 화면을 보는 사람은 개발자가 아니라 결혼 준비하는 두 사람이다.
 */
export interface DbErrorHelp {
  title: string;
  detail: string;
  steps: string[];
  /** 다시 로그인이 필요한 오류인지 */
  relogin?: boolean;
}

export function explainDbError(raw: string | null | undefined): DbErrorHelp {
  const text = raw ?? "";
  const m = text.toLowerCase();
  const where = SUPABASE_HOST ? ` (지금 연결된 곳: ${SUPABASE_HOST})` : "";

  if (m.includes("could not find the table") || m.includes("schema cache") || m.includes("relation") || m.includes("does not exist")) {
    return {
      title: "데이터베이스에 표가 아직 없어요",
      detail: `결혼 준비 앱이 쓸 표가 만들어져 있지 않아요${where}. SQL 을 한 번 실행하면 됩니다.`,
      steps: [
        "Supabase 에서 이 프로젝트를 열고 SQL Editor → New query 를 누르세요.",
        "저장소의 supabase/setup.sql 파일 전체를 복사해 붙여넣고 Run 하세요.",
        "“Success. No rows returned” 이 나오면 아래 다시 시도를 누르세요.",
      ],
    };
  }
  if (m.includes("permission denied") || m.includes("row-level security") || m.includes("violates row-level")) {
    return {
      title: "이 공간을 볼 권한이 없어요",
      detail: "로그인은 됐지만 이 결혼 공간의 멤버가 아니에요.",
      steps: [
        "상대에게 받은 초대 링크로 다시 들어가 참여하기를 눌러 주세요.",
        "직접 만든 공간이라면 로그아웃 후 만들 때 쓴 계정으로 다시 로그인해 주세요.",
      ],
    };
  }
  if (m.includes("jwt") || m.includes("token is expired") || m.includes("session")) {
    return {
      title: "로그인이 만료됐어요",
      detail: "보안을 위해 일정 시간이 지나면 다시 로그인이 필요해요.",
      steps: ["아래 로그아웃을 누르고 다시 로그인해 주세요."],
      relogin: true,
    };
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed") || m.includes("fetch failed")) {
    return {
      title: "서버에 연결하지 못했어요",
      detail: `인터넷이 끊겼거나 Supabase 주소가 잘못됐을 수 있어요${where}.`,
      steps: ["인터넷 연결을 확인하고 다시 시도를 눌러 주세요."],
    };
  }
  return { title: "데이터를 불러오지 못했어요", detail: text, steps: [] };
}
