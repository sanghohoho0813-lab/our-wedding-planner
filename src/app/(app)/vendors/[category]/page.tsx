import { redirect } from "next/navigation";

const MAP: Record<string, string> = { beauty: "beauty", bouquet: "bouquet", photo: "photo", coordination: "coordination" };

export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  redirect(`/wedding?tab=${MAP[category] ?? "all"}`);
}
