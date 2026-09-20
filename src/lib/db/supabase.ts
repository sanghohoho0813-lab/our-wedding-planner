"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChangeEvent, DataAdapter, RealtimeStatus } from "./adapter";
import { TABLE_NAMES, type TableMap, type TableName, type Wedding, type WeddingData } from "./types";

export class SupabaseAdapter implements DataAdapter {
  readonly mode = "supabase" as const;
  constructor(private sb: SupabaseClient) {}

  async loadWedding(weddingId: string): Promise<WeddingData> {
    const weddingRes = await this.sb.from("weddings").select("*").eq("id", weddingId).single();
    if (weddingRes.error) throw weddingRes.error;
    const results = await Promise.all(
      TABLE_NAMES.map((t) =>
        this.sb
          .from(t)
          .select("*")
          .eq("wedding_id", weddingId)
          .order("created_at", { ascending: t !== "activity_logs" })
          .limit(t === "activity_logs" ? 200 : 5000),
      ),
    );
    const data = { wedding: weddingRes.data as Wedding } as WeddingData;
    results.forEach((r, i) => {
      if (r.error) throw r.error;
      (data as unknown as Record<string, unknown[]>)[TABLE_NAMES[i]] = r.data ?? [];
    });
    return data;
  }

  async insert<T extends TableName>(table: T, row: TableMap[T]) {
    const { error } = await this.sb.from(table).insert(row);
    if (error) throw error;
  }

  /** 묶음 저장. 한 번에 너무 많이 보내면 거절당하므로 나눠 보내고, 같은 id 는 덮어쓴다. */
  async insertMany<T extends TableName>(table: T, rows: TableMap[T][]) {
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await this.sb.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict: "id" });
      if (error) throw error;
    }
  }

  async update<T extends TableName>(table: T, id: string, patch: Partial<TableMap[T]>) {
    const { error } = await this.sb.from(table).update(patch as unknown as TableMap[T]).eq("id", id);
    if (error) throw error;
  }

  async remove(table: TableName, id: string) {
    const { error } = await this.sb.from(table).delete().eq("id", id);
    if (error) throw error;
  }

  /**
   * 이 결혼 공간의 모든 행을 지운다.
   *
   * 백업을 복원할 때 id 가 새로 매겨지므로, 먼저 비우지 않으면 upsert 가 옛 행을
   * 덮지 못하고 **전부 두 벌이 된다**(예산 합계 · 하객 수가 두 배로 보인다).
   * 로컬 저장 모드에는 replaceAll 이 있어 이 문제가 없었고, 그래서 실제 Supabase 에서만
   * 드러났다. 외래키 때문에 자식 표부터 지운다.
   */
  async clearWedding(weddingId: string) {
    for (const table of [...TABLE_NAMES].reverse()) {
      const { error } = await this.sb.from(table).delete().eq("wedding_id", weddingId);
      if (error) throw error;
    }
  }

  async updateWedding(id: string, patch: Partial<Wedding>) {
    const { error } = await this.sb.from("weddings").update(patch).eq("id", id);
    if (error) throw error;
  }

  /**
   * 상대의 수정을 실시간으로 받는다.
   *
   * **표마다 따로 구독하지 않는다.** 전에는 표 17개에 각각 postgres_changes 를 걸었는데,
   * 실제 Supabase Realtime 은 한 채널에 바인딩이 많아지면(우리 환경에서 13개 이상)
   * 'SUBSCRIBED' 라고 답해 놓고 **이벤트를 한 건도 보내지 않는다.** 연결됨으로 보이는데
   * 상대의 수정이 영영 안 오는, 제일 알아채기 어려운 고장이다.
   *
   * 그래서 public 스키마 전체를 **한 번만** 구독하고, 어느 표인지는 여기서 가른다.
   * 남의 결혼 데이터는 Realtime 이 RLS 로 걸러 주므로 애초에 오지 않는다
   * (qa/real/realtime.mjs 에서 실제로 확인한다). 그래도 한 번 더 확인하고 버린다.
   */
  subscribe(weddingId: string, handler: (e: ChangeEvent) => void, onStatus?: (s: RealtimeStatus) => void) {
    const known = new Set<string>(TABLE_NAMES);
    const channel = this.sb.channel(`wedding:${weddingId}`);
    channel.on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
      const table = payload.table as string;
      if (table === "weddings") {
        const row = (payload.new ?? {}) as Wedding;
        if (payload.eventType === "UPDATE" && row.id === weddingId) handler({ type: "wedding", wedding: row });
        return;
      }
      if (!known.has(table)) return;
      const t = table as TableName;
      const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as { id?: string; wedding_id?: string };
      if (!row?.id || (row.wedding_id && row.wedding_id !== weddingId)) return;
      if (payload.eventType === "INSERT") handler({ type: "insert", table: t, row: payload.new as TableMap[TableName] });
      else if (payload.eventType === "UPDATE") handler({ type: "update", table: t, row: payload.new as TableMap[TableName] });
      else if (payload.eventType === "DELETE") handler({ type: "delete", table: t, id: row.id });
    });
    onStatus?.("connecting");
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") onStatus?.("live");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onStatus?.("error");
      else if (status === "CLOSED") onStatus?.("off");
    });
    return () => {
      onStatus?.("off");
      this.sb.removeChannel(channel);
    };
  }
}
