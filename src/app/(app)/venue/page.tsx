import { redirect } from "next/navigation";
export default function Page() {
  redirect("/wedding?tab=venue");
}
