import { notFound } from "next/navigation";
import { VendorsView } from "@/components/vendors/VendorsView";
import { VENDOR_PAGES } from "@/components/vendors/vendorConfig";

type Key = keyof typeof VENDOR_PAGES;

export function generateStaticParams() {
  return Object.keys(VENDOR_PAGES).map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cfg = VENDOR_PAGES[category as Key];
  return { title: cfg?.title ?? "업체" };
}

export default async function VendorCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cfg = VENDOR_PAGES[category as Key];
  if (!cfg) notFound();
  return <VendorsView cfg={cfg} />;
}
