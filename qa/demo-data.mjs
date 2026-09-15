// Demo dataset for visual QA (injected into localStorage in local mode)
const WID = "00000000-0000-4000-8000-000000000001";
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const ts = new Date().toISOString();
const today = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const rel = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return iso(d); };
const row = (o) => ({ id: id(), wedding_id: WID, created_at: ts, updated_at: ts, ...o });

export function buildDemo() {
  const wedding = { id: WID, name: "상호 & 지은의 결혼 준비", wedding_date: "2026-12-21", wedding_time: "13:00", groom_name: "상호", bride_name: "지은", total_budget: 25000000, invite_code: "LOCAL", created_by: "local-user", created_at: ts, updated_at: ts };
  const catNames = [["웨딩홀", "building-2"], ["스드메", "camera"], ["신혼여행", "plane"], ["예복", "shirt"], ["헤어 & 메이크업", "sparkles"], ["부케", "flower-2"], ["청첩장", "mail"], ["선물", "gift"], ["기타", "more-horizontal"]];
  const budget_categories = catNames.map(([name, icon], i) => row({ name, icon, sort_order: i, planned_amount: [6000000, 2500000, 4500000, 2000000, 1500000, 300000, 300000, 1500000, 1000000][i] }));
  const cat = (name) => budget_categories.find((c) => c.name === name).id;
  const budget_items = [
    row({ category_id: cat("웨딩홀"), name: "웨딩홀 대관 + 식대", estimated_amount: 5000000, actual_amount: 5675000, vendor_name: "더채플 청담", memo: "보증 200명", is_favorite: true, sort_order: 0 }),
    row({ category_id: cat("스드메"), name: "스튜디오 촬영", estimated_amount: 1500000, actual_amount: 1725000, vendor_name: "OO스튜디오", memo: null, is_favorite: false, sort_order: 1 }),
    row({ category_id: cat("스드메"), name: "드레스", estimated_amount: 1200000, actual_amount: 0, vendor_name: "OO드레스", memo: null, is_favorite: false, sort_order: 2 }),
    row({ category_id: cat("신혼여행"), name: "항공권 (로마 왕복)", estimated_amount: 2600000, actual_amount: 2480000, vendor_name: "대한항공", memo: null, is_favorite: false, sort_order: 3 }),
    row({ category_id: cat("신혼여행"), name: "숙소 6박", estimated_amount: 1800000, actual_amount: 0, vendor_name: null, memo: null, is_favorite: false, sort_order: 4 }),
    row({ category_id: cat("예복"), name: "신랑 예복 맞춤", estimated_amount: 900000, actual_amount: 950000, vendor_name: "OO테일러", memo: null, is_favorite: false, sort_order: 5 }),
    row({ category_id: cat("헤어 & 메이크업"), name: "본식 헤어 · 메이크업", estimated_amount: 1200000, actual_amount: 0, vendor_name: "OO뷰티", memo: null, is_favorite: false, sort_order: 6 }),
    row({ category_id: cat("부케"), name: "부케 + 부토니에", estimated_amount: 250000, actual_amount: 0, vendor_name: "OO플라워", memo: null, is_favorite: false, sort_order: 7 }),
    row({ category_id: cat("청첩장"), name: "종이 청첩장 200매", estimated_amount: 180000, actual_amount: 0, vendor_name: null, memo: null, is_favorite: false, sort_order: 8 }),
  ];
  const item = (name) => budget_items.find((i) => i.name === name).id;
  const payments = [
    row({ budget_item_id: item("웨딩홀 대관 + 식대"), title: "계약금", amount: 1000000, due_date: rel(-60), paid: true, paid_at: rel(-60), memo: null }),
    row({ budget_item_id: item("웨딩홀 대관 + 식대"), title: "잔금", amount: 4675000, due_date: "2026-12-14", paid: false, paid_at: null, memo: null }),
    row({ budget_item_id: item("스튜디오 촬영"), title: "계약금", amount: 500000, due_date: rel(-30), paid: true, paid_at: rel(-30), memo: null }),
    row({ budget_item_id: item("스튜디오 촬영"), title: "잔금", amount: 500000, due_date: rel(7), paid: false, paid_at: null, memo: null }),
    row({ budget_item_id: item("항공권 (로마 왕복)"), title: "전액", amount: 2480000, due_date: rel(18), paid: false, paid_at: null, memo: null }),
    row({ budget_item_id: item("신랑 예복 맞춤"), title: "전액", amount: 950000, due_date: rel(-10), paid: true, paid_at: rel(-10), memo: null }),
  ];
  const T = (title, category, days, status = "todo", priority = "normal") => row({ title, category, due_date: days === null ? null : rel(days), status, priority, assignee: "both", memo: null, vendor_id: null, budget_item_id: null, is_favorite: false, completed_at: status === "done" ? ts : null, sort_order: 0 });
  const tasks = [
    T("청첩장 주문", "청첩장", 2, "doing", "high"), T("부케 최종 확정", "부케", 5), T("하객 명단 확인", "하객", 8, "doing"), T("예복 피팅", "예복", 10), T("식순 최종 점검", "기타", 14, "todo", "high"), T("신혼여행 준비물 정리", "신혼여행", 20), T("부모님 인사 준비", "상견례", 25), T("축가 최종 확인", "기타", 30, "waiting"), T("헬퍼 이모님 예약", "헤어&메이크업", 35, "waiting"), T("혼주 한복 대여", "예복", 40, "todo", "low"), T("청첩장 모임 장소 예약", "청첩장", 12, "doing"),
    ...["예식장 투어 및 계약", "스드메 업체 비교 및 예약", "상견례", "신혼여행지 정하기", "드레스 투어", "항공권 예약", "예물 구매", "청첩장 디자인 고르기", "웨딩 촬영 컨셉 회의", "스튜디오 촬영", "신혼집 계약", "혼수 리스트 작성", "예단 협의", "모바일 청첩장 제작", "사회자 섭외", "주례 없는 식순 구성", "하객 버스 알아보기", "웨딩 반지 사이즈 확인", "혼인신고 일정 논의", "축의금 계좌 정리", "폐백 여부 결정"].map((t) => T(t, "기타", -Math.floor(Math.random() * 100) - 1, "done")),
  ];
  const events = [
    row({ title: "드레스 피팅", type: "fitting", date: rel(2), start_time: "14:00", end_time: "15:30", location: "OO드레스", memo: null, source_type: null, source_id: null, is_done: false }),
    row({ title: "예복 방문", type: "visit", date: rel(5), start_time: "11:00", end_time: null, location: "OO테일러", memo: null, source_type: null, source_id: null, is_done: false }),
    row({ title: "스튜디오 촬영", type: "shoot", date: rel(10), start_time: "10:00", end_time: "17:00", location: "OO스튜디오", memo: "헬퍼 동행", source_type: null, source_id: null, is_done: false }),
    row({ title: "상견례", type: "meeting", date: rel(-20), start_time: "12:00", end_time: null, location: "OO한정식", memo: null, source_type: null, source_id: null, is_done: true }),
  ];
  const vendors = [
    row({ category: "beauty", name: "OO뷰티 청담", contact_name: "김실장", phone: "010-1234-5678", url: "https://example.com", reserved_date: rel(-15), visit_date: rel(9), deposit: 200000, balance: 1000000, total_amount: 1200000, payment_status: "deposit", status: "contracted", memo: "리허설 포함", is_favorite: true, details: { designer: "지원 원장", rehearsal_date: rel(40), wedding_start_time: "09:00", on_site: false, includes: "신부, 신랑, 혼주 2명" } }),
    row({ category: "beauty", name: "OO헤어 신사", contact_name: null, phone: null, url: null, reserved_date: null, visit_date: null, deposit: 0, balance: 0, total_amount: 1100000, payment_status: "unpaid", status: "candidate", memo: null, is_favorite: false, details: {} }),
    row({ category: "bouquet", name: "OO플라워", contact_name: "박플로리스트", phone: "010-2222-3333", url: null, reserved_date: rel(-5), visit_date: null, deposit: 0, balance: 250000, total_amount: 250000, payment_status: "unpaid", status: "contracted", memo: null, is_favorite: false, details: { flowers: "화이트 라넌큘러스 + 그린", boutonniere: true, delivery: "venue" } }),
    row({ category: "photo", name: "OO스튜디오", contact_name: "이실장", phone: "010-4444-5555", url: "https://example.com", reserved_date: rel(-30), visit_date: rel(10), deposit: 500000, balance: 500000, total_amount: 1000000, payment_status: "deposit", status: "contracted", memo: null, is_favorite: false, details: { kind: "studio", shoot_date: rel(10), shoot_time: "10:00", originals: true } }),
    row({ category: "photo", name: "OO스냅", contact_name: null, phone: null, url: null, reserved_date: null, visit_date: null, deposit: 0, balance: 0, total_amount: 700000, payment_status: "unpaid", status: "candidate", memo: "야외 가능", is_favorite: false, details: { kind: "snap" } }),
    row({ category: "coordination", name: "OO웨딩플래너", contact_name: "최플래너", phone: "010-6666-7777", url: null, reserved_date: rel(-90), visit_date: rel(15), deposit: 300000, balance: 0, total_amount: 300000, payment_status: "paid", status: "contracted", memo: null, is_favorite: false, details: { service: "planner", planner: "최OO", meeting_date: rel(15) } }),
  ];
  const venues = [
    row({ name: "더채플 청담", address: "서울 강남구 청담동", event_date: "2026-12-21", event_time: "13:00", is_contracted: true, deposit: 1000000, balance: 4675000, hall_fee: 1500000, meal_cost: 75000, guaranteed_guests: 200, expected_guests: 230, parking: "300대 · 2시간 무료", transport: "7호선 청담역 도보 5분", notes: "홀 사용 2시간, 폐백실 무료", contact_name: "정매니저", phone: "02-000-0000", url: "https://example.com", memo: null, is_favorite: true }),
    row({ name: "OO컨벤션 역삼", address: "서울 강남구 역삼동", event_date: "2026-12-20", event_time: "12:00", is_contracted: false, deposit: 0, balance: 0, hall_fee: 1000000, meal_cost: 68000, guaranteed_guests: 250, expected_guests: 230, parking: "500대", transport: "2호선 역삼역 3번 출구", notes: null, contact_name: null, phone: null, url: null, memo: "분리예식 불가", is_favorite: false }),
  ];
  const honeymoon = [row({ country: "이탈리아", city: "로마 · 피렌체", depart_date: "2026-12-22", return_date: "2026-12-29", flight_info: "대한항공 KE931 인천 13:05", flight_booked: true, flight_booking_no: "ABC123", hotel_name: "Hotel de Russie", hotel_booked: false, hotel_booking_no: null, cost: 4300000, memo: "환전, 로밍, 여행자보험" })];
  const honeymoon_items = [
    row({ kind: "checklist", title: "여권 만료일 확인", date: null, time: null, done: true, memo: null, sort_order: 0 }),
    row({ kind: "checklist", title: "여행자 보험 가입", date: null, time: null, done: false, memo: null, sort_order: 1 }),
    row({ kind: "checklist", title: "유심 · 로밍 신청", date: null, time: null, done: false, memo: null, sort_order: 2 }),
    row({ kind: "itinerary", title: "콜로세움 투어", date: "2026-12-23", time: "10:00", done: false, memo: "예약 완료", sort_order: 0 }),
    row({ kind: "itinerary", title: "피렌체 이동 (기차)", date: "2026-12-26", time: "09:30", done: false, memo: null, sort_order: 1 }),
  ];
  const music_items = [
    row({ slot: "pre", title: "Sunday Morning", artist: "Maroon 5", url: "https://youtube.com", section: null, is_confirmed: true, memo: null, sort_order: 0 }),
    row({ slot: "bride_entry", title: "Can't Help Falling in Love", artist: "Elvis Presley", url: "https://youtube.com", section: "0:00 ~ 1:30", is_confirmed: true, memo: null, sort_order: 0 }),
    row({ slot: "groom_entry", title: "Marry You", artist: "Bruno Mars", url: null, section: null, is_confirmed: false, memo: null, sort_order: 0 }),
    row({ slot: "song", title: "축가 — 미정", artist: "친구 OO", url: null, section: null, is_confirmed: false, memo: "반주 MR 준비", sort_order: 0 }),
    row({ slot: "march", title: "Signed, Sealed, Delivered", artist: "Stevie Wonder", url: null, section: null, is_confirmed: false, memo: null, sort_order: 0 }),
  ];
  const outfit_items = [
    row({ kind: "신랑 예복", vendor_name: "OO테일러", reserve_date: rel(-10), fitting_date: rel(5), pickup_date: rel(60), cost: 950000, is_paid: true, memo: "네이비 투버튼", is_favorite: false }),
    row({ kind: "신부 드레스", vendor_name: "OO드레스", reserve_date: rel(-30), fitting_date: rel(2), pickup_date: null, cost: 1200000, is_paid: false, memo: null, is_favorite: true }),
    row({ kind: "한복", vendor_name: "OO한복", reserve_date: null, fitting_date: rel(45), pickup_date: rel(80), cost: 400000, is_paid: false, memo: "혼주 포함", is_favorite: false }),
  ];
  const G = (name, side, relation, rsvp, companions = 0, extra = {}) => row({ name, side, relation, rsvp, companions, meal: rsvp === "yes" ? "yes" : "unknown", contacted: rsvp !== "maybe", invitation_sent: rsvp === "yes", invitation_method: rsvp === "yes" ? "mobile" : null, memo: null, ...extra });
  const guests = [
    G("김아버지", "groom", "가족", "yes", 1), G("김어머니", "groom", "가족", "yes"), G("김동생", "groom", "가족", "yes", 1), G("박민수", "groom", "친구", "yes"), G("이준호", "groom", "친구", "maybe"), G("최대리", "groom", "직장", "yes", 1, { memo: "팀 대표 참석" }), G("정과장", "groom", "직장", "no"),
    G("이아버지", "bride", "가족", "yes", 1), G("이어머니", "bride", "가족", "yes"), G("이모", "bride", "친척", "yes", 2), G("한소희", "bride", "친구", "yes"), G("윤지민", "bride", "친구", "maybe"), G("강팀장", "bride", "직장", "yes"), G("오수진", "bride", "학교", "maybe", 1),
  ];
  const invitation_meetings = [
    row({ title: "대학 동기 모임", target: "신랑 대학 친구 8명", date: rel(12), time: "19:00", place: "OO식당 강남", attendees: "민수, 준호, 성민 …", attendee_count: 8, estimated_cost: 400000, actual_cost: 0, status: "planned", memo: null, event_id: null }),
    row({ title: "회사 팀 점심", target: "신부 팀원", date: rel(-3), time: "12:00", place: "회사 근처", attendees: null, attendee_count: 6, estimated_cost: 200000, actual_cost: 180000, status: "done", memo: null, event_id: null }),
  ];
  const gifts = [
    row({ recipient: "양가 부모님", relation: "부모님", item: "한복 + 상품권", estimated_cost: 1000000, actual_cost: 0, is_purchased: false, is_delivered: false, delivered_at: null, memo: null }),
    row({ recipient: "사회자 (민수)", relation: "친구", item: "상품권 20만원", estimated_cost: 200000, actual_cost: 200000, is_purchased: true, is_delivered: false, delivered_at: null, memo: null }),
    row({ recipient: "축가 (OO)", relation: "친구", item: "선물 세트", estimated_cost: 150000, actual_cost: 0, is_purchased: false, is_delivered: false, delivered_at: null, memo: null }),
  ];
  const memos = [
    row({ content: "스냅 작가님께 야외 촬영 가능한지 물어보기", converted_to: null }),
    row({ content: "부케 컬러 — 드레스 톤이랑 맞춰서 아이보리 + 그린?", converted_to: null }),
  ];
  const log = (minAgo, description, entity_type, action) => ({ id: id(), wedding_id: WID, user_id: "local-user", entity_type, entity_id: null, action, description, created_at: new Date(Date.now() - minAgo * 60000).toISOString() });
  const activity_logs = [
    log(120, "'스튜디오 촬영' 비용이 수정되었어요.", "budget_items", "update"),
    log(300, "하객 김동생님이 참석 확정되었어요.", "guests", "update"),
    log(1500, "'OO플라워' 업체 메모가 추가되었어요.", "vendors", "update"),
    log(1600, "청첩장 모임 '대학 동기 모임'이 등록되었어요.", "invitation_meetings", "create"),
  ];
  return { wedding, tasks, budget_categories, budget_items, payments, vendors, venues, honeymoon, honeymoon_items, music_items, outfit_items, guests, invitation_meetings, gifts, events, memos, activity_logs, attachments: [] };
}
export const DEMO_KEY = `owp:data:${WID}`;
