/**
 * 두 사람 동시 사용 검증용 임시 서버 (테스트 전용).
 *
 *   node qa/relay.mjs [포트]
 *
 * 왜 필요한가:
 * 실시간 동기화는 '두 클라이언트가 같은 백엔드에 붙어 granular 이벤트를 주고받는' 상황에서만
 * 제대로 검증된다. 운영 Supabase 에는 절대 테스트 데이터를 넣지 않고, 이 환경에는 별도의
 * 테스트용 Supabase 프로젝트도 없다. 그래서 Supabase Realtime 과 **같은 모양의 이벤트**를
 * 내보내는 작은 서버를 띄워, 브라우저 컨텍스트 두 개를 여기에 붙인다.
 *
 * 검증되는 것: 앱의 이벤트 처리 · 충돌 · 되돌리기 · 오프라인 큐 (= 버그가 사는 곳)
 * 검증되지 않는 것: Supabase 의 전송 계층과 RLS (그쪽은 scripts/verify_supabase_sql.sh 담당)
 *
 * 메모리에만 있고 프로세스가 끝나면 사라진다. 운영 데이터와 섞일 길이 없다.
 */
import http from "node:http";
import { randomUUID } from "node:crypto";

const port = Number(process.argv[2] ?? 4100);

/** @type {Map<string, any>} weddingId → WeddingData */
const store = new Map();
/** @type {Set<{ wedding: string, res: import("node:http").ServerResponse }>} */
const clients = new Set();
/** 언제 보내도 400 으로 답할 행들 (테스트용) */
let rejected = new Set();
/** 지연·끊김을 흉내 내기 위한 스위치 */
const net = { delayMs: 0, down: false };

const send = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(body ?? null));
};

function broadcast(weddingId, event) {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const c of clients) if (c.wedding === weddingId) c.res.write(line);
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (d) => (b += d));
    req.on("end", () => {
      try {
        resolve(b ? JSON.parse(b) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST",
    });
    return res.end();
  }

  // ---- 테스트 제어 (앱이 아니라 검사 스크립트가 부른다) ----
  if (url.pathname === "/__seed") {
    const body = await readBody(req);
    store.set(body.wedding.id, body);
    return send(res, 200, { ok: true, wedding: body.wedding.id });
  }
  if (url.pathname === "/__net") {
    const body = await readBody(req);
    if (typeof body.down === "boolean") net.down = body.down;
    if (typeof body.delayMs === "number") net.delayMs = body.delayMs;
    return send(res, 200, net);
  }
  // 특정 행을 '아무리 보내도 안 되는' 상태로 만든다 (제약조건 위반 · 권한 없음 흉내)
  if (url.pathname === "/__reject") {
    const body = await readBody(req);
    if (Array.isArray(body.ids)) rejected = new Set(body.ids);
    return send(res, 200, { rejected: [...rejected] });
  }
  if (url.pathname === "/__dump") {
    return send(res, 200, store.get(url.searchParams.get("wedding")) ?? null);
  }

  if (net.down) return send(res, 503, { message: "relay is down (테스트)" });
  if (net.delayMs) await new Promise((r) => setTimeout(r, net.delayMs));

  const weddingId = url.searchParams.get("wedding");
  const data = weddingId ? store.get(weddingId) : null;

  if (url.pathname === "/load") {
    if (!data) return send(res, 404, { message: "no such wedding" });
    return send(res, 200, data);
  }

  // ---- 실시간 스트림 (Supabase Realtime 자리) ----
  if (url.pathname === "/events") {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "access-control-allow-origin": "*",
    });
    res.write(": connected\n\n");
    const entry = { wedding: weddingId, res };
    clients.add(entry);
    req.on("close", () => clients.delete(entry));
    return;
  }

  if (req.method !== "POST") return send(res, 404, { message: "not found" });
  if (!data) return send(res, 404, { message: "no such wedding" });
  const body = await readBody(req);

  const targetId = body.id ?? body.row?.id;
  if (targetId && rejected.has(targetId))
    return send(res, 400, { message: 'new row violates check constraint "guests_side_check" (테스트)' });

  if (url.pathname === "/insert") {
    const list = data[body.table];
    // 같은 id 가 이미 있으면 덮어쓴다 (재시도해도 안전하게)
    const i = list.findIndex((r) => r.id === body.row.id);
    if (i >= 0) list[i] = body.row;
    else list.push(body.row);
    broadcast(weddingId, { type: "insert", table: body.table, row: body.row, by: body.by ?? null });
    return send(res, 200, { ok: true });
  }

  if (url.pathname === "/update") {
    const list = data[body.table];
    const row = list.find((r) => r.id === body.id);
    // 지워진 행을 고치려 하면 0건이 바뀐다 — Supabase 도 오류가 아니라 '0건' 으로 답한다.
    if (!row) return send(res, 200, { ok: true, affected: 0 });
    Object.assign(row, body.patch);
    broadcast(weddingId, { type: "update", table: body.table, row, by: body.by ?? null });
    return send(res, 200, { ok: true, affected: 1 });
  }

  if (url.pathname === "/delete") {
    const list = data[body.table];
    const i = list.findIndex((r) => r.id === body.id);
    if (i >= 0) list.splice(i, 1);
    broadcast(weddingId, { type: "delete", table: body.table, id: body.id, by: body.by ?? null });
    return send(res, 200, { ok: true, affected: i >= 0 ? 1 : 0 });
  }

  if (url.pathname === "/wedding") {
    Object.assign(data.wedding, body.patch);
    broadcast(weddingId, { type: "wedding", wedding: data.wedding, by: body.by ?? null });
    return send(res, 200, { ok: true });
  }

  return send(res, 404, { message: "not found" });
});

server.listen(port, () => console.log(`relay up on :${port} (pid ${process.pid}) — 테스트 전용, 메모리에만 있음`));
