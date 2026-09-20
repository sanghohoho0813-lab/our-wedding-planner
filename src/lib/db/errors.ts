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
  /** 무슨 오류인지 알아본 경우(= 아래 steps 가 실제로 도움이 됨) */
  known?: boolean;
}

export function explainDbError(raw: string | null | undefined): DbErrorHelp {
  const text = raw ?? "";
  const m = text.toLowerCase();
  const where = SUPABASE_HOST ? ` (지금 연결된 곳: ${SUPABASE_HOST})` : "";

  if (m.includes("could not find the table") || m.includes("schema cache") || m.includes("relation") || m.includes("does not exist")) {
    return {
      known: true,
      title: "데이터베이스에 표가 아직 없어요",
      detail: `결혼 준비 앱이 쓸 표가 만들어져 있지 않아요${where}. SQL 을 한 번 실행하면 됩니다.`,
      steps: [
        `Supabase 대시보드에서 이 프로젝트를 여세요. 주소가 ${SUPABASE_HOST || "위에 적힌 곳"} 과 같은 프로젝트인지 꼭 확인하세요. 다른 프로젝트에서 실행하면 이 화면이 계속 나옵니다.`,
        "SQL Editor → New query 에 supabase/setup.sql 파일 전체를 붙여넣고 Run 하세요.",
        "“Success. No rows returned” 이 나오면 아래 다시 시도를 누르세요.",
        "실행했는데도 계속 나온다면 SQL Editor 에서 notify pgrst, 'reload schema'; 를 한 번 실행한 뒤 다시 시도하세요.",
      ],
    };
  }
  // 앱은 새 값을 쓰려는데 데이터베이스가 아직 옛 규칙인 경우.
  // (예: '공통 지인'을 넣으려는데 0005 SQL 을 아직 실행하지 않았을 때)
  if (m.includes("violates check constraint") || m.includes("check constraint")) {
    const side = m.includes("side");
    return {
      known: true,
      title: side ? "'공통 지인' 을 아직 저장할 수 없어요" : "데이터베이스가 아직 옛 규칙이에요",
      detail: side
        ? `하객을 '공통'(신랑 · 신부 둘 다 아는 사람)으로 두려면 짧은 SQL 을 한 번 더 실행해야 해요${where}.`
        : `앱이 새로 쓰는 값을 데이터베이스가 아직 허용하지 않아요${where}. SQL 을 한 번 더 실행하면 됩니다.`,
      steps: [
        `Supabase 대시보드에서 이 프로젝트(${SUPABASE_HOST || "연결된 곳"})를 여세요.`,
        side
          ? "SQL Editor → New query 에 supabase/migrations/0005_guest_side_both.sql 파일 전체를 붙여넣고 Run 하세요. (짧은 파일이라 한 화면에 들어옵니다)"
          : "SQL Editor → New query 에 supabase/setup.sql 파일 전체를 붙여넣고 Run 하세요.",
        "“Success. No rows returned” 이 나오면 아래 다시 시도를 누르세요.",
      ],
    };
  }
  if (m.includes("permission denied") || m.includes("row-level security") || m.includes("violates row-level")) {
    return {
      known: true,
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
      known: true,
      title: "로그인이 만료됐어요",
      detail: "보안을 위해 일정 시간이 지나면 다시 로그인이 필요해요.",
      steps: ["아래 로그아웃을 누르고 다시 로그인해 주세요."],
      relogin: true,
    };
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed") || m.includes("fetch failed")) {
    return {
      known: true,
      title: "서버에 연결하지 못했어요",
      detail: `인터넷이 끊겼거나 Supabase 주소가 잘못됐을 수 있어요${where}.`,
      steps: ["인터넷 연결을 확인하고 다시 시도를 눌러 주세요."],
    };
  }
  return { known: false, title: "데이터를 불러오지 못했어요", detail: text, steps: [] };
}
