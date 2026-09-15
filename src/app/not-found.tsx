import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-script text-[2.5rem] text-accent-text">Oops</p>
      <p className="mt-2 text-fg-2">페이지를 찾을 수 없어요.</p>
      <Link href="/" className="mt-6 rounded-full bg-accent px-5 py-2.5 text-[0.9375rem] font-medium text-accent-fg">
        홈으로
      </Link>
    </div>
  );
}
