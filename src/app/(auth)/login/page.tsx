import { Suspense } from "react";
import { AuthForm } from "@/components/shared/AuthForm";

export const metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
