# -*- coding: utf-8 -*-
"""
원본 Google Spreadsheet(결혼 계획표_공유용) → 앱 데이터셋 생성기.

사용법:
    python3 scripts/build_migration.py <원본.xlsx>

출력:
    data/original-sheets.json      원본 셀 값 그대로의 스냅샷(재현용)
    src/lib/db/original-data.ts    앱이 불러오는 이관 데이터셋 + Audit

원칙:
    - 값을 지어내지 않는다. 원본에 없는 업체/금액/날짜/하객을 만들지 않는다.
    - Google 템플릿 예시 행(website.com, email@email.com, (+82) 000-0000 등)은 제외하고 Audit에 기록한다.
    - 원본 메모에서 파생한 레코드는 derived=True로 표시하고 원문을 memo에 보존한다.
"""
import datetime
import json
import re
import sys
import uuid
from urllib.parse import unquote

NS = uuid.UUID("6f1a1d3e-9b2c-4f7a-8d21-0a5c6e7b4c10")
WEEK = ["월", "화", "수", "목", "금", "토", "일"]

# 사용자가 명시한 결혼식 날짜. 원본 '할 일' 메모에는 2026.12.20(일) 13:00 으로 적혀 있어 Audit 경고로 남긴다.
WEDDING_DATE = "2026-12-21"
WEDDING_TIME = "13:00"

warnings = []
audit = []


def wid(*parts):
    return str(uuid.uuid5(NS, "|".join(str(p) for p in parts)))


def weekday_ko(iso):
    return WEEK[datetime.date.fromisoformat(iso).weekday()]


def cell(v):
    """셀 값을 문자열로. 날짜/시간은 ISO로."""
    if v is None:
        return ""
    if isinstance(v, datetime.datetime):
        return v.strftime("%Y-%m-%dT%H:%M") if (v.hour or v.minute) else v.strftime("%Y-%m-%d")
    if isinstance(v, datetime.date):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, datetime.time):
        return v.strftime("%H:%M")
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v).strip()


def num(v):
    if v is None or v == "":
        return 0
    if isinstance(v, (int, float)):
        return int(round(v))
    s = re.sub(r"[^\d.-]", "", str(v))
    try:
        return int(round(float(s)))
    except ValueError:
        return 0


def money(v, label, unit_log):
    """
    원본 견적 칸은 일부가 '만원' 단위로 적혀 있다(예: 150 = 150만원).
    실제 항목 최소 금액이 110,000원이므로 0 < v < 10000 이면 만원 단위로 판정해 ×10,000 한다.
    변환한 항목은 모두 기록해 Audit에 남긴다.
    """
    n = num(v)
    if 0 < n < 10000:
        unit_log.append({"label": label, "raw": n, "converted": n * 10000})
        return n * 10000, n
    return n, None


TEMPLATE_TOKENS = ["website.com", "email@email.com", "(+82) 000-0000", "000-0000"]
TEMPLATE_NAMES = re.compile(r"^(웨딩드레스 매장 \d+|사진 촬영 기사 \d+|플로리스트 \d+|매장 [A-D0-9]+|설명)$")


def is_template_row(values):
    joined = " ".join(values)
    if any(tok in joined for tok in TEMPLATE_TOKENS):
        return True
    return any(TEMPLATE_NAMES.match(v.strip()) for v in values if v)


def parse_date_ko(text):
    """'2023.01.01' / '2026.02.16' / '26.12.22' → ISO. 실패하면 None."""
    if not text:
        return None
    t = text.strip()
    m = re.match(r"^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$", t)
    if m:
        y, mo, d = (int(x) for x in m.groups())
    else:
        m = re.match(r"^(\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})$", t)
        if not m:
            return None
        y, mo, d = (int(x) for x in m.groups())
        y += 2000
    try:
        return datetime.date(y, mo, d).isoformat()
    except ValueError:
        return None


def main(path):
    import openpyxl

    wb = openpyxl.load_workbook(path, data_only=True)
    raw = {}
    for ws in wb.worksheets:
        rows = []
        for r in ws.iter_rows():
            vals = [cell(c.value) for c in r]
            while vals and vals[-1] == "":
                vals.pop()
            rows.append(vals)
        while rows and not any(v for v in rows[-1]):
            rows.pop()
        raw[ws.title] = rows
    json.dump(raw, open("data/original-sheets.json", "w"), ensure_ascii=False, indent=1)

    S = lambda name: raw.get(name, [])
    at = lambda rows, i, j: rows[i][j] if i < len(rows) and j < len(rows[i]) else ""

    out = {k: [] for k in [
        "tasks", "budget_categories", "budget_items", "payments", "vendors", "venues",
        "honeymoon", "honeymoon_items", "music_items", "outfit_items", "guests",
        "invitation_meetings", "gifts", "events", "memos",
    ]}
    unit_log = []

    # ---------------- 할 일 ----------------
    rows = S("할 일")
    src_rows = 0
    TASK_CATEGORY = [
        (("웨딩홀", "시식"), "식장"), (("스냅", "사진", "dvd", "DVD", "촬영"), "사진·영상"),
        (("드레스", "예복", "한복", "정장", "옷"), "예복"), (("헤어", "메이크업"), "헤어·메이크업"),
        (("부케",), "부케"), (("청첩장",), "청첩장"), (("신혼여행", "비행기", "숙소", "여행일정"), "신혼여행"),
        (("플래너",), "코디네이션"), (("반지",), "예물"), (("상견례", "부모님께 인사"), "상견례"),
        (("신혼집",), "혼수"), (("사회", "축가"), "음악"), (("답례품",), "선물"),
        (("결혼식 일정",), "식장"),
    ]
    STATUS = {"완료": "done", "진행 중": "doing", "시작하지 않음": "todo", "대기": "waiting"}
    order = 0
    for i, r in enumerate(rows):
        if i < 5:
            continue
        title = at(rows, i, 1).strip()
        if not title or title == "할 일":
            continue
        src_rows += 1
        due_raw = at(rows, i, 2).strip()
        status_raw = at(rows, i, 3).strip()
        memo = at(rows, i, 4).strip()
        due = parse_date_ko(due_raw)
        if due_raw and not due:
            memo = (memo + " · " if memo else "") + f"원본 마감 표기: {due_raw}"
        clean = re.sub(r"^[-–]\s*", "", title).strip()
        category = next((c for keys, c in TASK_CATEGORY if any(k in clean for k in keys)), "기타")
        status = STATUS.get(status_raw, "todo")
        out["tasks"].append({
            "id": wid("task", i, clean), "title": clean, "category": category, "due_date": due,
            "status": status, "priority": "normal", "assignee": "both", "memo": memo or None,
            "completed_at": None, "sort_order": order,
        })
        order += 1
    audit.append({"sheet": "할 일", "source": src_rows, "migrated": len(out["tasks"]), "skipped": 0, "note": "마감일 텍스트(예: '2026.02 안에는')는 메모로 보존"})

    # ---------------- 예산 견적기 / 상세 예산 ----------------
    est = S("예산 견적기")
    total_budget = num(at(est, 3, 2))
    summary = {}
    est_src = 0
    for i in range(5, len(est)):
        name = at(est, i, 1).strip()
        if not name or name in ("합계",) or name.startswith("맞춤 카테고리"):
            continue
        est_src += 1
        summary[name] = {
            "estimate": num(at(est, i, 2)), "actual": num(at(est, i, 3)), "memo": at(est, i, 5).strip(),
        }

    det = S("상세 예산")
    blocks = []
    i = 0
    while i < len(det):
        if at(det, i, 2).strip() == "견적" and at(det, i, 3).strip() == "실제":
            cat = at(det, i, 1).strip()
            items = []
            j = i + 1
            while j < len(det) and at(det, j, 1).strip() not in ("예정 예산", ""):
                items.append((j, at(det, j, 1).strip(), at(det, j, 2), at(det, j, 3), at(det, j, 4).strip() or at(det, j, 5).strip()))
                j += 1
            planned = 0
            while j < len(det):
                if at(det, j, 1).strip() == "예정 예산":
                    planned = num(at(det, j + 1, 1))
                    break
                j += 1
            blocks.append({"category": cat, "items": items, "planned": planned})
            i = j + 1
        else:
            i += 1

    CATEGORY_ICON = {
        "웨딩홀": "building-2", "야외스냅": "camera", "스냅 부가비용 (드헤메,소품)": "sparkles",
        "드메": "shirt", "본식스냅": "camera", "본식DVD": "video", "반지": "gem", "예복": "shirt",
        "혼주 메이크업": "sparkles", "한복 대여비": "shirt", "가족들 정장": "shirt",
        "신혼여행": "plane", "상견례": "utensils", "청첩장": "mail", "청첩장모임": "users",
        "코디네이션": "clipboard-list",
    }
    cat_ids = {}
    ordered = list(summary.keys())
    for b in blocks:
        name = "코디네이션" if b["category"] == "#REF!" else b["category"]
        if name not in ordered:
            ordered.append(name)
    for idx, name in enumerate(ordered):
        cid = wid("cat", name)
        cat_ids[name] = cid
        planned = next((b["planned"] for b in blocks if (b["category"] if b["category"] != "#REF!" else "코디네이션") == name), 0)
        out["budget_categories"].append({
            "id": cid, "name": name, "icon": CATEGORY_ICON.get(name, "more-horizontal"),
            "sort_order": idx, "planned_amount": planned,
        })

    det_src = 0
    for b in blocks:
        name = "코디네이션" if b["category"] == "#REF!" else b["category"]
        for (ri, iname, e, a, memo) in b["items"]:
            if not iname:
                continue
            det_src += 1
            amount, rawman = money(e, f"{name} · {iname}", unit_log)
            actual = num(a)
            note = memo or ""
            if rawman is not None:
                note = (note + " · " if note else "") + f"원본 견적 {rawman}(만원 단위) → {amount:,}원으로 변환"
            out["budget_items"].append({
                "id": wid("item", name, iname), "category_id": cat_ids[name], "name": iname,
                "estimated_amount": amount, "actual_amount": actual, "vendor_name": None,
                "memo": note or None, "sort_order": len(out["budget_items"]),
            })
    # 상세 블록이 없는 카테고리(야외스냅, 스냅 부가비용)는 견적기 행을 항목 1건으로 이관
    detail_cats = {("코디네이션" if b["category"] == "#REF!" else b["category"]) for b in blocks}
    for name, s in summary.items():
        if name in detail_cats:
            continue
        if s["estimate"] == 0 and s["actual"] == 0 and not s["memo"]:
            continue
        out["budget_items"].append({
            "id": wid("item", name, "summary"), "category_id": cat_ids[name], "name": name,
            "estimated_amount": s["estimate"], "actual_amount": s["actual"], "vendor_name": None,
            "memo": s["memo"] or None, "sort_order": len(out["budget_items"]),
        })
    audit.append({"sheet": "예산 견적기", "source": est_src, "migrated": len(out["budget_categories"]), "skipped": 4, "note": "빈 '맞춤 카테고리 1~4' 제외. 총예산 15,000,000원 이관"})
    audit.append({"sheet": "상세 예산", "source": det_src, "migrated": len(out["budget_items"]), "skipped": 0, "note": f"상세 블록 없는 2개 카테고리는 견적기 행에서 항목 생성 · 만원 단위 {len(unit_log)}건 변환"})

    # 야외스냅 메모의 결제 내역(원문: "20만원 예약금 결제완료, 11만원 당일에 결제하면 됨")
    snap = next((it for it in out["budget_items"] if it["name"] == "야외스냅"), None)
    if snap:
        out["payments"].append({"id": wid("pay", "야외스냅", "예약금"), "budget_item_id": snap["id"], "title": "예약금",
                                "amount": 200000, "due_date": None, "paid": True, "paid_at": None,
                                "memo": "원본 메모: 20만원 예약금 결제완료"})
        out["payments"].append({"id": wid("pay", "야외스냅", "잔금"), "budget_item_id": snap["id"], "title": "당일 결제",
                                "amount": 110000, "due_date": None, "paid": False, "paid_at": None,
                                "memo": "원본 메모: 11만원 당일에 결제하면 됨"})

    # ---------------- 식장 ----------------
    venue_rows = S("식장")
    url_names = []
    for r in venue_rows:
        for v in r:
            if v.startswith("http") and "query=" in v:
                q = unquote(re.search(r"[?&]query=([^&]+)", v).group(1)).replace("+", " ")
                url_names.append((q.strip(), v))
    for idx, (name, url) in enumerate(url_names):
        out["venues"].append({
            "id": wid("venue", name), "name": name, "address": None, "event_date": None, "event_time": None,
            "is_contracted": False, "deposit": 0, "balance": 0, "hall_fee": 0, "meal_cost": 0,
            "guaranteed_guests": 0, "expected_guests": 0, "parking": None, "transport": None,
            "notes": None, "contact_name": None, "phone": None, "url": url,
            "memo": "원본 '식장' 시트의 사진 링크에서 이관된 후보", "is_favorite": False,
        })
    out["venues"].insert(0, {
        "id": wid("venue", "연대 동문회관 예식장"), "name": "연대 동문회관 예식장", "address": None,
        "event_date": WEDDING_DATE, "event_time": WEDDING_TIME, "is_contracted": True,
        "deposit": 0, "balance": 0, "hall_fee": 5000000, "meal_cost": 0,
        "guaranteed_guests": 0, "expected_guests": 0, "parking": None, "transport": None,
        "notes": "원본 할 일: 웨딩홀 정하기 — 완료 / 연대 동문회관 예식장",
        "contact_name": None, "phone": None, "url": None,
        "memo": "장소 대관료(기부금) 5,000,000원 · 250만원 엄마가 내줄듯?", "is_favorite": True,
    })
    audit.append({"sheet": "식장", "source": len(url_names) + 1, "migrated": len(out["venues"]), "skipped": 0,
                  "note": "원본 시트에는 이름 칸이 비어 있고 사진 링크만 있어 링크의 검색어에서 후보명을 복원. 계약 식장은 할 일 메모에서 이관"})

    # ---------------- 신혼여행 ----------------
    hm = S("신혼여행")
    legs = []
    for i in range(5, len(hm)):
        city = at(hm, i, 2).strip()
        period = at(hm, i, 3).strip()
        if not city and not period:
            continue
        m = re.match(r"^(\S+)\s*~\s*(\S+)$", period)
        start = parse_date_ko(m.group(1)) if m else None
        end = parse_date_ko(m.group(2)) if m else None
        legs.append({
            "country": at(hm, i, 1).strip(), "city": city, "start": start, "end": end,
            "site": at(hm, i, 4).strip(), "flight": num(at(hm, i, 6)), "memo": at(hm, i, 9).strip() or at(hm, i, 8).strip(),
        })
    out["honeymoon"].append({
        "id": wid("honeymoon"), "country": "태국", "city": " · ".join([l["city"] for l in legs if l["city"]][:2] + ["방콕"][:0]) or None,
        "depart_date": legs[0]["start"] if legs else None, "return_date": legs[-1]["end"] if legs else None,
        "flight_info": "12.22 대한항공 / 12.24 방콕 에어웨이 11:55~13:05 <-> 14:05~15:20",
        "flight_booked": True, "flight_booking_no": None,
        "hotel_name": "코사무이 wild cottage elephant sanctuary / 실라바디 풀 스파 리조트",
        "hotel_booked": True, "hotel_booking_no": None,
        "cost": 2026400,
        "memo": "원본 할 일: 비행기 예약 완료 / 숙소 예약 완료 · 코사무이 wild cottage elephant sanctuary 2026.12.23~2026.12.24, 실라바디 풀 스파 리조트 2026.12.24~2026.12.25",
    })
    for idx, l in enumerate(legs):
        label = f"{l['city']} {l['start'] or ''}~{l['end'] or ''}".strip()
        out["honeymoon_items"].append({
            "id": wid("hm", idx, l["city"]), "kind": "itinerary",
            "title": f"{l['city']} 체류" if l["city"] else "일정",
            "date": l["start"], "time": None, "done": False,
            "memo": " · ".join([x for x in [f"~ {l['end']}" if l["end"] else "", f"항공 {l['flight']:,}원" if l["flight"] else "", l["site"], l["memo"]] if x]) or None,
            "sort_order": idx,
        })
    out["honeymoon_items"].append({"id": wid("hm", "hotel", 1), "kind": "itinerary", "title": "wild cottage elephant sanctuary 숙박",
                                   "date": "2026-12-23", "time": None, "done": False, "memo": "원본 할 일 메모: 2026.12.23~2026.12.24", "sort_order": 10})
    out["honeymoon_items"].append({"id": wid("hm", "hotel", 2), "kind": "itinerary", "title": "실라바디 풀 스파 리조트 숙박",
                                   "date": "2026-12-24", "time": None, "done": False, "memo": "원본 할 일 메모: 2026.12.24~2026.12.25", "sort_order": 11})
    out["honeymoon_items"].append({"id": wid("hm", "check", 1), "kind": "checklist", "title": "여행일정 짜기",
                                   "date": None, "time": None, "done": False, "memo": "원본 할 일: 시작하지 않음", "sort_order": 0})
    audit.append({"sheet": "신혼여행", "source": len(legs), "migrated": len(out["honeymoon_items"]), "skipped": 0,
                  "note": "3개 구간 + 할 일 메모의 숙소 2건 · 체크리스트 1건"})

    # ---------------- 음악 ----------------
    music = S("음악")
    slots = [at(music, i, 1).strip() for i in range(5, len(music)) if at(music, i, 1).strip()]
    audit.append({"sheet": "음악", "source": len(slots), "migrated": 0, "skipped": len(slots),
                  "note": f"원본 구간 {len(slots)}개({', '.join(slots)})에 후보곡이 하나도 입력되어 있지 않아 이관할 곡 없음"})

    # ---------------- 예복 ----------------
    outfit = S("예복")
    skipped_outfit = 0
    for i in range(5, len(outfit)):
        vals = [at(outfit, i, j) for j in range(0, 9)]
        name = at(outfit, i, 2).strip()
        if not name:
            continue
        if is_template_row(vals):
            skipped_outfit += 1
            continue
        out["outfit_items"].append({
            "id": wid("outfit", name), "kind": at(outfit, i, 1).strip() or "예복", "vendor_name": name,
            "reserve_date": None, "fitting_date": "2026-10-03", "pickup_date": None,
            "cost": num(at(outfit, i, 7)), "is_paid": False,
            "memo": " · ".join([x for x in [at(outfit, i, 8).strip(), "원본 할 일: 04.11(토) 맞추러 가기(야외스냅) / 10.03 오후 1시 본식 예복 맞추기"] if x]),
            "is_favorite": False,
        })
    out["outfit_items"].append({
        "id": wid("outfit", "드레스"), "kind": "신부 드레스", "vendor_name": "크리드제이 / 디아일",
        "reserve_date": None, "fitting_date": "2026-08-21", "pickup_date": None, "cost": 0, "is_paid": False,
        "memo": "원본 할 일: 드레스 정하기 — 완료 / 크리드제이·디아일 드투 8.21(금)", "is_favorite": False,
    })
    audit.append({"sheet": "예복", "source": 2, "migrated": len(out["outfit_items"]) - 1, "skipped": skipped_outfit,
                  "note": "Google 템플릿 예시 행(웨딩드레스 매장 1) 제외 · 드레스는 할 일 메모에서 추가 이관"})

    # ---------------- 코디네이션 ----------------
    coord = S("코디네이션")
    coord_src = 0
    for i in range(5, len(coord)):
        name = at(coord, i, 1).strip()
        if not name:
            continue
        vals = [at(coord, i, j) for j in range(0, 8)]
        if is_template_row(vals):
            continue
        coord_src += 1
        out["vendors"].append({
            "id": wid("vendor", "coordination", name), "category": "coordination", "name": name,
            "contact_name": None, "phone": at(coord, i, 3).strip().replace("(+82) ", "") or None,
            "url": at(coord, i, 5).strip() or None, "reserved_date": None, "visit_date": None,
            "deposit": 0, "balance": 0, "total_amount": num(at(coord, i, 6)),
            "payment_status": "unpaid", "status": "contracted",
            "memo": " · ".join([x for x in [at(coord, i, 2).strip(), at(coord, i, 7).strip(), "원본 할 일: 웨딩플래너 정하기 — 진행 중 / 제이웨딩 권예인 플래너"] if x]),
            "is_favorite": False, "details": {"role": at(coord, i, 2).strip()},
        })
    audit.append({"sheet": "코디네이션", "source": coord_src, "migrated": coord_src, "skipped": 0, "note": ""})

    # ---------------- 사진 촬영 기사 ----------------
    photo = S("사진 촬영 기사")
    skipped_photo = sum(1 for i in range(5, len(photo)) if at(photo, i, 1).strip() and is_template_row([at(photo, i, j) for j in range(0, 8)]))
    derived_photo = [
        ("스트롤 스냅", "야외 웨딩스냅", 310000, "outdoor", "2025-05-22", "14:00", "양화한강공원",
         "원본 할 일: 스냅사진 정하기 — 완료 / 스트롤 스냅 · 25.05.22 (금) 오후 2시 양화한강공원"),
        ("사계절", "본식 스냅", 310000, "snap", None, None, None,
         "원본 할 일: 본식스냅, dvd 정하기 — 완료 / 스냅 : 사계절 · 예산 메모: 포인트로 30만원 차감시 31만원, 아니면 61만원"),
        ("에이딘룩", "본식 DVD", 350000, "video", None, None, None,
         "원본 할 일: 본식스냅, dvd 정하기 — 완료 / dvd : 에이딘룩 · 예산 메모: 포인트로 30만원 차감시 35만원, 아니면 65만원"),
    ]
    for name, label, cost, kind, d, t, place, memo in derived_photo:
        out["vendors"].append({
            "id": wid("vendor", "photo", name), "category": "photo", "name": name, "contact_name": None,
            "phone": None, "url": None, "reserved_date": None, "visit_date": d, "deposit": 0, "balance": 0,
            "total_amount": cost, "payment_status": "unpaid", "status": "contracted", "memo": memo,
            "is_favorite": False, "details": {"kind": kind, "label": label, "shoot_date": d, "shoot_time": t, "place": place},
        })
    audit.append({"sheet": "사진 촬영 기사", "source": 1, "migrated": len(derived_photo), "skipped": skipped_photo,
                  "note": "원본 시트는 템플릿 예시 행만 있어 제외. 실제 업체 3곳은 할 일·예산 메모에서 이관"})

    # ---------------- 부케 ----------------
    bq = S("부케")
    bouquet_count = num(at(bq, 2, 2))
    bout_count = num(at(bq, 3, 2))
    skipped_bq = sum(1 for i in range(7, len(bq)) if at(bq, i, 1).strip() and is_template_row([at(bq, i, j) for j in range(0, 9)]))
    audit.append({"sheet": "부케", "source": 1, "migrated": 0, "skipped": skipped_bq,
                  "note": f"업체 미정(템플릿 행 제외). 필요 수량(부케 {bouquet_count} · 부토니에르 {bout_count})은 결혼 정보에 보존"})

    # ---------------- 헤어 및 메이크업 ----------------
    hair = S("헤어 및 메이크업")
    bride_count = num(at(hair, 2, 2))
    extra_count = num(at(hair, 3, 2))
    hair_hours = num(at(hair, 4, 2))
    for name, memo, detail in [
        ("뷰티진동희", "원본 할 일: 헤어샵 구하기 — 완료 / 메이크업샵 구하기 — 완료", {"scope": "신부 헤어·메이크업"}),
        ("메이크업101", "원본 할 일: 양가 어머님 본식 메이크업 — 완료 / 우리집: 메이크업101", {"scope": "혼주(신부측) 메이크업"}),
        ("w아틀리에", "원본 할 일: 양가 어머님 본식 메이크업 — 완료 / 어머님: w아틀리에", {"scope": "혼주(신랑측) 메이크업"}),
    ]:
        out["vendors"].append({
            "id": wid("vendor", "beauty", name), "category": "beauty", "name": name, "contact_name": None,
            "phone": None, "url": None, "reserved_date": None, "visit_date": None, "deposit": 0, "balance": 0,
            "total_amount": 0, "payment_status": "unpaid", "status": "contracted", "memo": memo,
            "is_favorite": False, "details": detail,
        })
    audit.append({"sheet": "헤어 및 메이크업", "source": 0, "migrated": 3, "skipped": 2,
                  "note": f"원본 시트는 인원/시간(신부 {bride_count}, 추가 {extra_count}, 헤어 {hair_hours}시간)만 있고 업체 행은 템플릿. 업체 3곳은 할 일 메모에서 이관"})

    # ---------------- 하객 목록 ----------------
    g = S("하객 목록")
    guest_src = 0
    for i in range(5, len(g)):
        name = at(g, i, 2).strip()
        if not name or name == "이름":
            continue
        guest_src += 1
        inviter = at(g, i, 4).strip()
        side = "bride" if inviter == "신부" else "groom"
        relation = at(g, i, 5).strip() or None
        paper = at(g, i, 6).strip()
        kakao = at(g, i, 7).strip()
        delivered = at(g, i, 8).strip()
        memo = at(g, i, 11).strip()
        rsvp = "maybe"
        clean_name = name
        m = re.match(r"^(.*)\((못옴|불참)\)$", name)
        if m:
            clean_name = m.group(1).strip()
            rsvp = "no"
            memo = (memo + " · " if memo else "") + f"원본 표기: {name}"
        method = None
        sent = False
        if paper and kakao:
            method, sent = "both", True
        elif paper:
            method, sent = "paper", True
        elif kakao:
            method, sent = "mobile", True
        out["guests"].append({
            "id": wid("guest", i, clean_name), "name": clean_name, "side": side, "relation": relation,
            "rsvp": rsvp, "companions": num(at(g, i, 10)), "meal": "unknown",
            "contacted": bool(delivered), "invitation_sent": sent, "invitation_method": method,
            "memo": memo or None,
        })
    audit.append({"sheet": "하객 목록", "source": guest_src, "migrated": len(out["guests"]), "skipped": 0,
                  "note": "초대자(신랑/신부) → 신랑측·신부측, '(못옴)' 표기 → 불참으로 이관"})

    # ---------------- 청첩장 모임 ----------------
    audit.append({"sheet": "청첩장 모임", "source": 0, "migrated": 0, "skipped": 0,
                  "note": "원본은 날짜 그리드 템플릿(5~9월)과 공휴일 표시만 있고 확정된 모임 일정이 없어 이관할 레코드 없음"})

    # ---------------- 선물 ----------------
    gifts = S("선물")
    skipped_gift = sum(1 for i in range(5, len(gifts)) if at(gifts, i, 1).strip() and is_template_row([at(gifts, i, j) for j in range(0, 9)]))
    audit.append({"sheet": "선물", "source": 0, "migrated": 0, "skipped": skipped_gift,
                  "note": "답례품·하객 선물 모두 템플릿 예시 행(매장 1~4, 매장 A~D)만 있어 이관할 레코드 없음"})

    # ---------------- 일정(결혼식 당일) ----------------
    sched = S("일정")
    day_rows = [at(sched, i, 1) for i in range(5, len(sched)) if at(sched, i, 1).strip()]
    audit.append({"sheet": "일정", "source": len(day_rows), "migrated": 0, "skipped": len(day_rows),
                  "note": "결혼식 당일 진행표에 시간(12:00)만 있고 항목이 비어 있어 이관할 레코드 없음"})

    # ---------------- 시트8 (월 생활비) ----------------
    s8 = S("시트8")
    lines = []
    for r in s8:
        vals = [v for v in r if v]
        if vals:
            lines.append(" ".join(vals))
    if lines:
        out["memos"].append({
            "id": wid("memo", "시트8"), "content": "원본 '시트8'(월 생활비 메모)\n" + "\n".join(lines), "converted_to": None,
        })
    audit.append({"sheet": "시트8", "source": len(lines), "migrated": 1, "skipped": 0,
                  "note": "결혼 준비와 별개인 월 생활비 계산표 → 메모 1건으로 보존"})

    # ---------------- 경고 ----------------
    warnings.append({
        "level": "high",
        "title": "결혼식 날짜 확인 필요",
        "detail": "원본 '할 일' 시트에는 결혼식 일정이 2026.12.20(일) 13:00 으로 적혀 있습니다. 요청하신 2026-12-21(월)로 설정했습니다. 설정 › 결혼 정보에서 바로 바꿀 수 있어요.",
    })
    warnings.append({
        "level": "medium",
        "title": "야외스냅 날짜 요일 불일치",
        "detail": "원본 메모 '25.05.22 (금)' 에서 2025-05-22는 목요일입니다. 적힌 날짜 그대로 2025-05-22로 이관했습니다.",
    })
    if unit_log:
        warnings.append({
            "level": "medium",
            "title": f"견적 금액 만원 단위 {len(unit_log)}건 변환",
            "detail": "원본 견적 칸 일부가 만원 단위(예: 150 = 150만원)로 적혀 있어 원 단위로 변환했습니다: "
                      + ", ".join(f"{u['label']} {u['raw']}→{u['converted']:,}원" for u in unit_log),
        })
    sheet_actual = sum(v["actual"] for v in summary.values())
    app_actual = sum(i["actual_amount"] for i in out["budget_items"])
    if sheet_actual != app_actual:
        warnings.append({
            "level": "medium",
            "title": "예산 합계가 원본 견적기와 다릅니다",
            "detail": f"'예산 견적기' 시트 실제 합계는 {sheet_actual:,}원이지만, 더 자세한 '상세 예산' 시트 기준으로는 {app_actual:,}원입니다. "
                      f"차액 {app_actual - sheet_actual:,}원은 견적기의 '드메' 실제금액이 드레스 피팅비·이모님 헬퍼비를 빠뜨린 것입니다. 앱은 상세 예산 기준으로 계산합니다.",
        })

    wedding = {
        "name": "우리의 결혼 준비",
        "wedding_date": WEDDING_DATE,
        "wedding_time": WEDDING_TIME,
        "groom_name": "",
        "bride_name": "",
        "total_budget": total_budget,
        "details": {
            "bouquet_count": bouquet_count, "boutonniere_count": bout_count,
            "beauty_bride": bride_count, "beauty_extra": extra_count, "beauty_hair_hours": hair_hours,
            "source": "결혼 계획표_공유용",
        },
    }

    ts = ["// 이 파일은 scripts/build_migration.py 가 원본 스프레드시트에서 생성합니다. 직접 수정하지 마세요.",
          "// 원본: Google Sheets '결혼 계획표_공유용' (data/original-sheets.json 스냅샷)",
          'import type { WeddingData } from "./types";', "",
          f"export const MIGRATION_SOURCE = {json.dumps('결혼 계획표_공유용', ensure_ascii=False)};",
          f"export const MIGRATION_GENERATED_AT = {json.dumps(datetime.datetime.now().strftime('%Y-%m-%d'), ensure_ascii=False)};",
          f"export const ORIGINAL_WEDDING = {json.dumps(wedding, ensure_ascii=False, indent=2)} as const;", "",
          "export interface AuditRow { sheet: string; source: number; migrated: number; skipped: number; note: string }",
          f"export const MIGRATION_AUDIT: AuditRow[] = {json.dumps(audit, ensure_ascii=False, indent=2)};", "",
          "export interface MigrationWarning { level: 'high' | 'medium' | 'low'; title: string; detail: string }",
          f"export const MIGRATION_WARNINGS: MigrationWarning[] = {json.dumps(warnings, ensure_ascii=False, indent=2)};", "",
          "type Rows = Record<string, unknown>[];",
          f"export const ORIGINAL_ROWS: Record<string, Rows> = {json.dumps(out, ensure_ascii=False, indent=2)};", "",
          "export type OriginalTable = keyof typeof ORIGINAL_ROWS;",
          "export const ORIGINAL_TOTALS = {",
          f"  tasks: {len(out['tasks'])}, budget_categories: {len(out['budget_categories'])}, budget_items: {len(out['budget_items'])},",
          f"  payments: {len(out['payments'])}, vendors: {len(out['vendors'])}, venues: {len(out['venues'])},",
          f"  honeymoon_items: {len(out['honeymoon_items'])}, outfit_items: {len(out['outfit_items'])}, guests: {len(out['guests'])}, memos: {len(out['memos'])},",
          "} as const;",
          "export type { WeddingData };", ""]
    open("src/lib/db/original-data.ts", "w").write("\n".join(ts))

    print("=== MIGRATION AUDIT ===")
    for a in audit:
        print(f"{a['sheet']:<16} 원본 {a['source']:>3}  이관 {a['migrated']:>3}  제외 {a['skipped']:>3}  {a['note'][:70]}")
    print("\n=== ENTITY COUNTS ===")
    for k, v in out.items():
        print(f"{k:<20} {len(v)}")
    print("\n총예산", f"{total_budget:,}", "| 실제합계(앱)", f"{app_actual:,}", "| 실제합계(견적기)", f"{sheet_actual:,}")
    print("\n=== WARNINGS ===")
    for w in warnings:
        print("-", w["title"])


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "plan.xlsx")
