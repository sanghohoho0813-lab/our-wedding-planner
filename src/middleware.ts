import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();
  return updateSession(request);
}

export const config = {
  // sw.js 는 반드시 빼야 한다. 로그인 검사에 걸려 /login 으로 넘어가면 브라우저가
  // "script resource is behind a redirect" 라며 서비스 워커 등록을 거부하고,
  // 오프라인 지원이 통째로 죽는다 (연결이 끊기면 앱이 아예 안 열린다).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)"],
};
