"use client";
import { ExternalLink, Phone, Plus, Store } from "lucide-react";
import { useState } from "react";
import type { VendorStatus } from "@/lib/db/types";
import { daysUntil, formatDDay, formatShortDate, todayISO } from "@/lib/date";
import { PAYMENT_STATUS_LABEL, VENDOR_STATUS, VENDOR_STATUS_LABEL } from "@/lib/labels";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { EntityCard } from "@/components/shared/EntityCard";
import { EntitySheet } from "@/components/shared/EntitySheet";
import { vendorFields, type VendorPageConfig } from "./vendorConfig";

const STATUS_TONE: Record<VendorStatus, BadgeTone> = { candidate: "neutral", contracted: "success", done: "info" };
const PAY_TONE = { unpaid: "neutral", deposit: "warning", paid: "success" } as const;

export function VendorsView({ cfg }: { cfg: VendorPageConfig }) {
  const vendors = useWeddingStore((s) => s.data!.vendors);
  const patch = useWeddingStore((s) => s.patch);
  const [status, setStatus] = useState<VendorStatus | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const today = todayISO();
  const list = vendors
    .filter((v) => v.category === cfg.category && (!status || v.status === status))
    .sort((a, b) => (a.status === "contracted" ? -1 : 1) - (b.status === "contracted" ? -1 : 1) || a.created_at.localeCompare(b.created_at));
  const all = vendors.filter((v) => v.category === cfg.category);
  const contracted = all.filter((v) => v.status === "contracted");
  const total = contracted.reduce((s, v) => s + v.total_amount, 0);
  const fields = vendorFields(cfg);

  return (
    <div>
      <PageHeader
        title={cfg.title}
        description={`${all.length}개 업체${contracted.length ? ` · 계약 ${contracted.length}곳 · ${formatKRW(total)}` : ""}`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> {cfg.addLabel}
          </Button>
        }
      >
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
          <Chip size="sm" active={status === null} onClick={() => setStatus(null)}>전체</Chip>
          {VENDOR_STATUS.map((s) => (
            <Chip key={s.value} size="sm" active={status === s.value} onClick={() => setStatus(status === s.value ? null : s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </PageHeader>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Store />} title={all.length === 0 ? cfg.emptyTitle : "조건에 맞는 업체가 없어요"} description={cfg.emptyDesc} actionLabel={cfg.addLabel} onAction={() => setCreating(true)} />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((v) => {
            const visit = v.visit_date && v.visit_date >= today ? v.visit_date : null;
            return (
              <EntityCard
                key={v.id}
                title={v.name}
                highlight={v.status === "contracted"}
                badges={
                  <>
                    <Badge tone={STATUS_TONE[v.status]}>{VENDOR_STATUS_LABEL[v.status]}</Badge>
                    {v.total_amount > 0 && <Badge tone={PAY_TONE[v.payment_status]}>{PAYMENT_STATUS_LABEL[v.payment_status]}</Badge>}
                  </>
                }
                subtitle={[v.contact_name, v.phone].filter(Boolean).join(" · ") || undefined}
                stats={[
                  { label: "총금액", value: v.total_amount ? formatKRW(v.total_amount) : "—" },
                  { label: "계약금", value: v.deposit ? formatKRW(v.deposit) : "—", tone: "muted" },
                  { label: "잔금", value: v.balance ? formatKRW(v.balance) : "—", tone: v.balance > 0 ? "accent" : "muted" },
                ]}
                footer={
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {visit && <span>방문 {formatDDay(daysUntil(visit, today))} · {formatShortDate(visit)}</span>}
                    {v.phone && (
                      <a href={`tel:${v.phone}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-accent-text hover:underline">
                        <Phone className="size-3" /> 전화
                      </a>
                    )}
                    {v.url && (
                      <a href={v.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-accent-text hover:underline">
                        <ExternalLink className="size-3" /> 링크
                      </a>
                    )}
                  </span>
                }
                favorite={v.is_favorite}
                onFavorite={(f) => patch("vendors", v.id, { is_favorite: f }, { log: false })}
                onClick={() => setEditId(v.id)}
              />
            );
          })}
        </ul>
      )}

      <EntitySheet
        table="vendors"
        open={!!editId || creating}
        onClose={() => { setEditId(null); setCreating(false); }}
        rowId={editId}
        fields={fields}
        titleCreate={cfg.addLabel}
        titleEdit="업체 정보"
        requiredKey="name"
        favoriteKey="is_favorite"
        size="lg"
        initial={{ category: cfg.category, status: status ?? "candidate" }}
      />
    </div>
  );
}
