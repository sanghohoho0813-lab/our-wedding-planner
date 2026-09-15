import { AppShell } from "@/components/layout/AppShell";

/**
 * 앱 셸은 정적으로 둔다.
 * 로그인 보호는 middleware 가 하고, 워크스페이스 결정은 클라이언트에서 한 번만 한다.
 * 덕분에 메뉴를 옮길 때 서버 왕복이 없어 전환이 즉시 일어난다.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
