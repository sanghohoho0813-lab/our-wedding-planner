import type { TableMap, TableName, Wedding, WeddingData } from "./types";

export type ChangeEvent =
  | { type: "insert"; table: TableName; row: TableMap[TableName] }
  | { type: "update"; table: TableName; row: TableMap[TableName] }
  | { type: "delete"; table: TableName; id: string }
  | { type: "wedding"; wedding: Wedding }
  | { type: "reload" };

export type RealtimeStatus = "off" | "connecting" | "live" | "error";

export interface DataAdapter {
  readonly mode: "local" | "supabase";
  loadWedding(weddingId: string): Promise<WeddingData>;
  insert<T extends TableName>(table: T, row: TableMap[T]): Promise<void>;
  /** 여러 행을 한 번에. 같은 id 는 덮어쓴다(중간에 실패해도 다시 실행할 수 있게). */
  insertMany?<T extends TableName>(table: T, rows: TableMap[T][]): Promise<void>;
  update<T extends TableName>(table: T, id: string, patch: Partial<TableMap[T]>): Promise<void>;
  remove(table: TableName, id: string): Promise<void>;
  updateWedding(id: string, patch: Partial<Wedding>): Promise<void>;
  replaceAll?(weddingId: string, data: WeddingData): Promise<void>;
  subscribe?(weddingId: string, handler: (e: ChangeEvent) => void, onStatus?: (s: RealtimeStatus) => void): () => void;
}
