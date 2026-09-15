import { Logo } from "@/components/layout/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 hero-gradient">
      <div className="mb-8 text-center">
        <Logo size="lg" className="inline-block" />
      </div>
      <div className="card w-full max-w-sm p-6 sm:p-7">{children}</div>
      <p className="mt-6 text-center text-[0.8125rem] text-fg-3">소중한 순간이 모여, 평생 기억할 하루가 됩니다.</p>
    </div>
  );
}
