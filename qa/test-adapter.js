/**
 * 검사용 어댑터 (브라우저 안에 주입된다).
 *
 * qa/relay.mjs 에 붙어서 Supabase 어댑터와 같은 모양으로 동작한다.
 * 실시간 이벤트는 SSE 로 받는데, Supabase Realtime 의 postgres_changes 와
 * 같은 모양(insert/update/delete/wedding)이라 앱 쪽 코드는 차이를 모른다.
 *
 * 화면 확인용으로 받은 데이터를 localStorage["__owpMirror"] 에 비춰 둔다
 * (검사 스크립트가 '이 클라이언트가 지금 무엇을 알고 있는지' 를 보기 위한 거울).
 */
(function () {
  const relay = window.__owpRelay;
  const WID = window.__owpWedding;
  const USER = window.__owpUser;

  const post = async (path, body) => {
    const res = await fetch(`${relay}${path}?wedding=${WID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, by: USER }),
    });
    if (!res.ok) throw new Error(`relay ${res.status}`);
    return res.json();
  };

  const mirror = (data) => {
    try {
      localStorage.setItem("__owpMirror", JSON.stringify(data));
    } catch {
      /* 거울은 검사용일 뿐이라 실패해도 앱 동작과 무관하다 */
    }
  };

  const adapter = {
    mode: "supabase", // 앱이 '둘이 쓰는 모드' 로 동작하게 한다
    async loadWedding(weddingId) {
      const res = await fetch(`${relay}/load?wedding=${weddingId}`);
      if (!res.ok) throw new Error(`relay ${res.status}`);
      const data = await res.json();
      mirror(data);
      return data;
    },
    insert: (table, row) => post("/insert", { table, row }),
    insertMany: async (table, rows) => {
      for (const row of rows) await post("/insert", { table, row });
    },
    update: (table, id, patch) => post("/update", { table, id, patch }),
    remove: (table, id) => post("/delete", { table, id }),
    updateWedding: (id, patch) => post("/wedding", { patch }),
    subscribe(weddingId, handler, onStatus) {
      onStatus?.("connecting");
      const es = new EventSource(`${relay}/events?wedding=${weddingId}`);
      es.onopen = () => onStatus?.("live");
      es.onerror = () => onStatus?.("error");
      es.onmessage = (ev) => {
        let e;
        try {
          e = JSON.parse(ev.data);
        } catch {
          return;
        }
        // 검사 스크립트가 들여다볼 수 있게 거울을 갱신한다
        try {
          const d = JSON.parse(localStorage.getItem("__owpMirror") ?? "null");
          if (d) {
            if (e.type === "wedding") d.wedding = e.wedding;
            else if (e.type === "delete") d[e.table] = (d[e.table] ?? []).filter((r) => r.id !== e.id);
            else if (e.type === "insert" || e.type === "update") {
              const list = d[e.table] ?? (d[e.table] = []);
              const i = list.findIndex((r) => r.id === e.row.id);
              if (i >= 0) list[i] = { ...list[i], ...e.row };
              else list.push(e.row);
            }
            mirror(d);
          }
        } catch {
          /* 거울 갱신 실패는 무시 */
        }
        handler(e);
      };
      return () => {
        es.close();
        onStatus?.("off");
      };
    },
  };

  window.__owpTestAdapter = adapter;
  window.__owpAdapter = adapter; // 검사 스크립트가 직접 부를 수 있게
})();
