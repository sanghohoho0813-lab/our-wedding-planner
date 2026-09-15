import { redirect } from "next/navigation";
export default function Page() {
  redirect("/guests?tab=gifts");
}
