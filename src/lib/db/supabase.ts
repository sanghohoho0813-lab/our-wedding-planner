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

  async update<T extends TableName>(table: T, id: string, patch: Partial<TableMap[T]>) {
    const { error } = await this.sb.from(table).update(patch as unknown as TableMap[T]).eq("id", id);
    if (error) throw error;
  }

  async remove(table: TableName, id: string) {
    const { error } = await this.sb.from(table).delete().eq("id", id);
    if (error) throw error;
  }

  async updateWedding(id: string, patch: Partial<Wedding>) {
    const { error } = await this.sb.from("weddings").update(patch).eq("id", id);
    if (error) throw error;
  }

  subscribe(weddingId: string, handler: (e: ChangeEvent) => void, onStatus?: (s: RealtimeStatus) => void) {
    const channel = this.sb.channel(`wedding:${weddingId}`);
    for (const table of TABLE_NAMES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `wedding_id=eq.${weddingId}` },
        (payload) => {
          if (payload.eventType === "INSERT") handler({ type: "insert", table, row: payload.new as TableMap[TableName] });
          else if (payload.eventType === "UPDATE") handler({ type: "update", table, row: payload.new as TableMap[TableName] });
          else if (payload.eventType === "DELETE") handler({ type: "delete", table, id: (payload.old as { id: string }).id });
        },
      );
    }
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "weddings", filter: `id=eq.${weddingId}` },
      (payload) => handler({ type: "wedding", wedding: payload.new as Wedding }),
    );
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
