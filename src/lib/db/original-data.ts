// 이 파일은 scripts/build_migration.py 가 원본 스프레드시트에서 생성합니다. 직접 수정하지 마세요.
// 원본: Google Sheets '결혼 계획표_공유용' (data/original-sheets.json 스냅샷)
import type { WeddingData } from "./types";

export const MIGRATION_SOURCE = "결혼 계획표_공유용";
export const MIGRATION_GENERATED_AT = "2026-09-15";
export const ORIGINAL_WEDDING = {
  "name": "우리의 결혼 준비",
  "wedding_date": "2026-12-21",
  "wedding_time": "13:00",
  "groom_name": "",
  "bride_name": "",
  "total_budget": 15000000,
  "details": {
    "bouquet_count": 5,
    "boutonniere_count": 14,
    "beauty_bride": 1,
    "beauty_extra": 5,
    "beauty_hair_hours": 3,
    "source": "결혼 계획표_공유용"
  }
} as const;

export interface AuditRow { sheet: string; source: number; migrated: number; skipped: number; note: string }
export const MIGRATION_AUDIT: AuditRow[] = [
  {
    "sheet": "할 일",
    "source": 28,
    "migrated": 28,
    "skipped": 0,
    "note": "마감일 텍스트(예: '2026.02 안에는')는 메모로 보존"
  },
  {
    "sheet": "예산 견적기",
    "source": 15,
    "migrated": 16,
    "skipped": 4,
    "note": "빈 '맞춤 카테고리 1~4' 제외. 총예산 15,000,000원 이관"
  },
  {
    "sheet": "상세 예산",
    "source": 36,
    "migrated": 38,
    "skipped": 0,
    "note": "상세 블록 없는 2개 카테고리는 견적기 행에서 항목 생성 · 만원 단위 9건 변환"
  },
  {
    "sheet": "식장",
    "source": 7,
    "migrated": 7,
    "skipped": 0,
    "note": "원본 시트에는 이름 칸이 비어 있고 사진 링크만 있어 링크의 검색어에서 후보명을 복원. 계약 식장은 할 일 메모에서 이관"
  },
  {
    "sheet": "신혼여행",
    "source": 3,
    "migrated": 6,
    "skipped": 0,
    "note": "3개 구간 + 할 일 메모의 숙소 2건 · 체크리스트 1건"
  },
  {
    "sheet": "음악",
    "source": 5,
    "migrated": 0,
    "skipped": 5,
    "note": "원본 구간 5개(결혼 시작전, 신랑입장, 신부입장, 부모님 인사, 신랑,신부 행진)에 후보곡이 하나도 입력되어 있지 않아 이관할 곡 없음"
  },
  {
    "sheet": "예복",
    "source": 2,
    "migrated": 1,
    "skipped": 1,
    "note": "Google 템플릿 예시 행(웨딩드레스 매장 1) 제외 · 드레스는 할 일 메모에서 추가 이관"
  },
  {
    "sheet": "코디네이션",
    "source": 1,
    "migrated": 1,
    "skipped": 0,
    "note": ""
  },
  {
    "sheet": "사진 촬영 기사",
    "source": 1,
    "migrated": 3,
    "skipped": 1,
    "note": "원본 시트는 템플릿 예시 행만 있어 제외. 실제 업체 3곳은 할 일·예산 메모에서 이관"
  },
  {
    "sheet": "부케",
    "source": 1,
    "migrated": 0,
    "skipped": 1,
    "note": "업체 미정(템플릿 행 제외). 필요 수량(부케 5 · 부토니에르 14)은 결혼 정보에 보존"
  },
  {
    "sheet": "헤어 및 메이크업",
    "source": 0,
    "migrated": 3,
    "skipped": 2,
    "note": "원본 시트는 인원/시간(신부 1, 추가 5, 헤어 3시간)만 있고 업체 행은 템플릿. 업체 3곳은 할 일 메모에서 이관"
  },
  {
    "sheet": "하객 목록",
    "source": 43,
    "migrated": 43,
    "skipped": 0,
    "note": "초대자(신랑/신부) → 신랑측·신부측, '(못옴)' 표기 → 불참으로 이관"
  },
  {
    "sheet": "청첩장 모임",
    "source": 0,
    "migrated": 0,
    "skipped": 0,
    "note": "원본은 날짜 그리드 템플릿(5~9월)과 공휴일 표시만 있고 확정된 모임 일정이 없어 이관할 레코드 없음"
  },
  {
    "sheet": "선물",
    "source": 0,
    "migrated": 0,
    "skipped": 8,
    "note": "답례품·하객 선물 모두 템플릿 예시 행(매장 1~4, 매장 A~D)만 있어 이관할 레코드 없음"
  },
  {
    "sheet": "일정",
    "source": 1,
    "migrated": 0,
    "skipped": 1,
    "note": "결혼식 당일 진행표에 시간(12:00)만 있고 항목이 비어 있어 이관할 레코드 없음"
  },
  {
    "sheet": "시트8",
    "source": 14,
    "migrated": 1,
    "skipped": 0,
    "note": "결혼 준비와 별개인 월 생활비 계산표 → 메모 1건으로 보존"
  }
];

export interface MigrationWarning { level: 'high' | 'medium' | 'low'; title: string; detail: string }
export const MIGRATION_WARNINGS: MigrationWarning[] = [
  {
    "level": "high",
    "title": "결혼식 날짜 확인 필요",
    "detail": "원본 '할 일' 시트에는 결혼식 일정이 2026.12.20(일) 13:00 으로 적혀 있습니다. 요청하신 2026-12-21(월)로 설정했습니다. 설정 › 결혼 정보에서 바로 바꿀 수 있어요."
  },
  {
    "level": "medium",
    "title": "야외스냅 날짜 요일 불일치",
    "detail": "원본 메모 '25.05.22 (금)' 에서 2025-05-22는 목요일입니다. 적힌 날짜 그대로 2025-05-22로 이관했습니다."
  },
  {
    "level": "medium",
    "title": "견적 금액 만원 단위 9건 변환",
    "detail": "원본 견적 칸 일부가 만원 단위(예: 150 = 150만원)로 적혀 있어 원 단위로 변환했습니다: 드메 · 스드메 기본 150→1,500,000원, 드메 · 드레스 피팅비 20→200,000원, 드메 · 스튜디오 원본 40→400,000원, 드메 · 메이크업 얼리비용 10→100,000원, 드메 · 이모님 헬퍼비 20→200,000원, 드메 · 기타 10→100,000원, 한복 대여비 · 한복대여비 40→400,000원, 가족들 정장 · 혼주 정장 200→2,000,000원, 가족들 정장 · 가족 정장 50→500,000원"
  },
  {
    "level": "medium",
    "title": "예산 합계가 원본 견적기와 다릅니다",
    "detail": "'예산 견적기' 시트 실제 합계는 10,051,800원이지만, 더 자세한 '상세 예산' 시트 기준으로는 10,411,800원입니다. 차액 360,000원은 견적기의 '드메' 실제금액이 드레스 피팅비·이모님 헬퍼비를 빠뜨린 것입니다. 앱은 상세 예산 기준으로 계산합니다."
  }
];

type Rows = Record<string, unknown>[];
export const ORIGINAL_ROWS: Record<string, Rows> = {
  "tasks": [
    {
      "id": "74460c3e-0f5a-5235-a6bc-b9e1341cde1a",
      "title": "신랑 부모님께 인사드리기",
      "category": "상견례",
      "due_date": "2023-01-01",
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": null,
      "completed_at": null,
      "sort_order": 0
    },
    {
      "id": "d348e73a-4dcc-5cc3-9c00-a8bd729d0312",
      "title": "신부 부모님께 인사드리기",
      "category": "상견례",
      "due_date": "2023-01-02",
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": null,
      "completed_at": null,
      "sort_order": 1
    },
    {
      "id": "d57060c7-4c69-55f0-8ef1-83976c258ec6",
      "title": "웨딩플래너 정하기",
      "category": "코디네이션",
      "due_date": "2026-02-16",
      "status": "doing",
      "priority": "normal",
      "assignee": "both",
      "memo": "제이웨딩 권예인 플래너",
      "completed_at": null,
      "sort_order": 2
    },
    {
      "id": "acdec256-5f53-575f-9590-8721bc1abdd2",
      "title": "결혼식 일정 정하기",
      "category": "식장",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "2026.12.20(일) 13:00",
      "completed_at": null,
      "sort_order": 3
    },
    {
      "id": "d6e1ed49-8c34-5197-b341-67936fbd6812",
      "title": "웨딩홀 정하기",
      "category": "식장",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "연대 동문회관 예식장",
      "completed_at": null,
      "sort_order": 4
    },
    {
      "id": "5a83790f-3c5d-5eef-bfb6-daf81ea9264d",
      "title": "스냅사진 정하기",
      "category": "사진·영상",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "스트롤 스냅/ 25.05.22 (금) 오후 2시 양화한강공원",
      "completed_at": null,
      "sort_order": 5
    },
    {
      "id": "64a50919-1560-520e-8321-505262ccb6a4",
      "title": "헤어샵 구하기",
      "category": "헤어·메이크업",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "뷰티진동희",
      "completed_at": null,
      "sort_order": 6
    },
    {
      "id": "0d70716a-14e0-599f-9c2d-71ab6d38c41b",
      "title": "메이크업샵 구하기",
      "category": "헤어·메이크업",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "뷰티진동희",
      "completed_at": null,
      "sort_order": 7
    },
    {
      "id": "bccdeca7-283d-5295-aa73-1b48648503c8",
      "title": "본식스냅, dvd 정하기",
      "category": "사진·영상",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "스냅 : 사계절  , dvd : 에이딘룩",
      "completed_at": null,
      "sort_order": 8
    },
    {
      "id": "86064267-0d07-59a8-a1f4-364d55f1844f",
      "title": "신랑예복 준비",
      "category": "예복",
      "due_date": null,
      "status": "doing",
      "priority": "normal",
      "assignee": "both",
      "memo": "아틀레/ 04.11(토) 맞추러 가기(야외스냅)/ 10.03 오후 1시 본식 예복 맞추기",
      "completed_at": null,
      "sort_order": 9
    },
    {
      "id": "ba9e8f1f-825e-56f9-ae48-5114bbf719a3",
      "title": "반지 맞추기",
      "category": "예물",
      "due_date": null,
      "status": "todo",
      "priority": "normal",
      "assignee": "both",
      "memo": "오빠껏만 사기",
      "completed_at": null,
      "sort_order": 10
    },
    {
      "id": "aada0dad-6b1d-5b6d-bc85-239d3faaa994",
      "title": "웨딩사진 촬영하기",
      "category": "사진·영상",
      "due_date": null,
      "status": "todo",
      "priority": "normal",
      "assignee": "both",
      "memo": "스트롤 스냅/ 25.05.22 (금) 오후 2시 양화한강공원",
      "completed_at": null,
      "sort_order": 11
    },
    {
      "id": "2b455546-c46c-5e14-92e4-9d23fce2a205",
      "title": "상견례하기",
      "category": "상견례",
      "due_date": null,
      "status": "todo",
      "priority": "normal",
      "assignee": "both",
      "memo": null,
      "completed_at": null,
      "sort_order": 12
    },
    {
      "id": "60f98ecd-22fe-5214-a374-2b2c3d56a074",
      "title": "청첩장 만들기 (종이)",
      "category": "청첩장",
      "due_date": null,
      "status": "todo",
      "priority": "normal",
      "assignee": "both",
      "memo": null,
      "completed_at": null,
      "sort_order": 13
    },
    {
      "id": "126568ed-128d-51ba-aff3-a4fa3c35964a",
      "title": "청첩장 만들기 (모바일)",
      "category": "청첩장",
      "due_date": null,
      "status": "todo",
      "priority": "normal",
      "assignee": "both",
      "memo": null,
      "completed_at": null,
      "sort_order": 14
    },
    {
      "id": "765958b2-f71b-5159-81ee-fc72a62afe7d",
      "title": "드레스 정하기",
      "category": "예복",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "크리드제이/디아일 드투 8.21(금)",
      "completed_at": null,
      "sort_order": 15
    },
    {
      "id": "730b42e1-f043-555c-a1d4-2844d44f474e",
      "title": "신혼여행지 정하기",
      "category": "신혼여행",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "태국 방콕,  코사무이 · 원본 마감 표기: 2026.02 안에는",
      "completed_at": null,
      "sort_order": 16
    },
    {
      "id": "801053a9-261a-5163-beeb-1605f66b8c82",
      "title": "비행기 예약",
      "category": "신혼여행",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "12.22 대한항공 , 12.24 방콕 에어웨이 11:55~13:05 <-> 14:05~15:20",
      "completed_at": null,
      "sort_order": 17
    },
    {
      "id": "f75fae44-9bd0-5bcd-84ed-1dece365c59d",
      "title": "숙소 예약",
      "category": "신혼여행",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "코사무이 wild cottage elephant sanctuary 2026.12.23~2026.12.24/ \n실라바디 풀 스파 리조트 2026.12.24~2026.12.25",
      "completed_at": null,
      "sort_order": 18
    },
    {
      "id": "0fb708b8-d7f2-5769-b491-1f2eb0b22d9b",
      "title": "여행일정 짜기",
      "category": "신혼여행",
      "due_date": null,
      "status": "todo",
      "priority": "normal",
      "assignee": "both",
      "memo": null,
      "completed_at": null,
      "sort_order": 19
    },
    {
      "id": "725e71b7-8ac3-5638-81cb-eb540588107b",
      "title": "웨딩홀 시식가기",
      "category": "식장",
      "due_date": null,
      "status": "todo",
      "priority": "normal",
      "assignee": "both",
      "memo": null,
      "completed_at": null,
      "sort_order": 20
    },
    {
      "id": "f01aa667-dc95-5a07-9659-9c97002c57b6",
      "title": "사회, 축가 부탁하기",
      "category": "음악",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "사회: 강래원오빠  축사: 지언언니",
      "completed_at": null,
      "sort_order": 21
    },
    {
      "id": "71f0a8c1-b401-5eca-ada2-83467d03fd4f",
      "title": "부케 구하기",
      "category": "부케",
      "due_date": null,
      "status": "todo",
      "priority": "normal",
      "assignee": "both",
      "memo": "현지한테 부케 받아달라구?",
      "completed_at": null,
      "sort_order": 22
    },
    {
      "id": "4586bb47-e160-5371-9a0a-805191beeade",
      "title": "청첩장 모임",
      "category": "청첩장",
      "due_date": null,
      "status": "todo",
      "priority": "normal",
      "assignee": "both",
      "memo": null,
      "completed_at": null,
      "sort_order": 23
    },
    {
      "id": "6ccce007-b971-5f1b-97a9-df83a70d487b",
      "title": "부모님 옷 준비 (한복, 정장)",
      "category": "예복",
      "due_date": null,
      "status": "todo",
      "priority": "normal",
      "assignee": "both",
      "memo": null,
      "completed_at": null,
      "sort_order": 24
    },
    {
      "id": "0022ba4f-80c4-5837-b6b1-2fe3f54b099b",
      "title": "신혼집 구하기",
      "category": "혼수",
      "due_date": null,
      "status": "doing",
      "priority": "normal",
      "assignee": "both",
      "memo": null,
      "completed_at": null,
      "sort_order": 25
    },
    {
      "id": "9c045251-8e4a-555a-9dff-7b07104aa1b2",
      "title": "양가 어머님 본식 메이크업",
      "category": "헤어·메이크업",
      "due_date": null,
      "status": "done",
      "priority": "normal",
      "assignee": "both",
      "memo": "우리집:메이크업101 , 어머님 : w아틀리에",
      "completed_at": null,
      "sort_order": 26
    },
    {
      "id": "c4531877-fe26-5b7c-a2b7-bb1c6acbe109",
      "title": "답례품 준비",
      "category": "선물",
      "due_date": null,
      "status": "todo",
      "priority": "normal",
      "assignee": "both",
      "memo": null,
      "completed_at": null,
      "sort_order": 27
    }
  ],
  "budget_categories": [
    {
      "id": "55597404-c0f1-5781-bed4-e17113358807",
      "name": "웨딩홀",
      "icon": "building-2",
      "sort_order": 0,
      "planned_amount": 5000000
    },
    {
      "id": "0d5c3e8f-7e7b-5133-a81e-20f84f3c031a",
      "name": "야외스냅",
      "icon": "camera",
      "sort_order": 1,
      "planned_amount": 0
    },
    {
      "id": "aa705e5c-7813-570c-af54-3dbc8fc876fc",
      "name": "스냅 부가비용 (드헤메,소품)",
      "icon": "sparkles",
      "sort_order": 2,
      "planned_amount": 0
    },
    {
      "id": "6cd62305-a0d6-59eb-a0fa-57093050b791",
      "name": "드메",
      "icon": "shirt",
      "sort_order": 3,
      "planned_amount": 0
    },
    {
      "id": "839f0fa1-c599-57db-9001-ef74a3cf9f36",
      "name": "본식스냅",
      "icon": "camera",
      "sort_order": 4,
      "planned_amount": 0
    },
    {
      "id": "afbbba73-4964-5d57-863f-d19e6afcca4f",
      "name": "본식DVD",
      "icon": "video",
      "sort_order": 5,
      "planned_amount": 0
    },
    {
      "id": "aa897c58-3d29-5d53-96d0-bed41b878c4d",
      "name": "반지",
      "icon": "gem",
      "sort_order": 6,
      "planned_amount": 800000
    },
    {
      "id": "027baa05-e920-5ec6-9e66-af9004b46200",
      "name": "예복",
      "icon": "shirt",
      "sort_order": 7,
      "planned_amount": 0
    },
    {
      "id": "75fbe832-fe56-51fa-bd00-88ea23eb62ae",
      "name": "혼주 메이크업",
      "icon": "sparkles",
      "sort_order": 8,
      "planned_amount": 0
    },
    {
      "id": "7c057e0f-98ed-5c31-905e-a3cbf60695a5",
      "name": "한복 대여비",
      "icon": "shirt",
      "sort_order": 9,
      "planned_amount": 0
    },
    {
      "id": "41788204-be77-5e08-80c9-ed78eea32196",
      "name": "가족들 정장",
      "icon": "shirt",
      "sort_order": 10,
      "planned_amount": 0
    },
    {
      "id": "96b6186d-7afd-5542-a26b-67698464351a",
      "name": "신혼여행",
      "icon": "plane",
      "sort_order": 11,
      "planned_amount": 5000000
    },
    {
      "id": "2f50c1b9-38db-5076-9d1b-4da391564ec3",
      "name": "상견례",
      "icon": "utensils",
      "sort_order": 12,
      "planned_amount": 0
    },
    {
      "id": "072b2f0d-4df1-5c95-af8e-7f7adfcc61b0",
      "name": "청첩장",
      "icon": "mail",
      "sort_order": 13,
      "planned_amount": 0
    },
    {
      "id": "ad8fbe7a-913e-5d93-b7f2-b44113396584",
      "name": "청첩장모임",
      "icon": "users",
      "sort_order": 14,
      "planned_amount": 0
    },
    {
      "id": "8eddcf6f-7aaf-5e63-a9aa-8cc38efd5696",
      "name": "코디네이션",
      "icon": "clipboard-list",
      "sort_order": 15,
      "planned_amount": 0
    }
  ],
  "budget_items": [
    {
      "id": "08e0f844-b742-5cc8-919f-66ea17d6dcd9",
      "category_id": "55597404-c0f1-5781-bed4-e17113358807",
      "name": "장소 대관료 (기부금)",
      "estimated_amount": 5000000,
      "actual_amount": 5000000,
      "vendor_name": null,
      "memo": null,
      "sort_order": 0
    },
    {
      "id": "29ff3892-40b9-5f34-81d4-cba319694059",
      "category_id": "55597404-c0f1-5781-bed4-e17113358807",
      "name": "식사비용",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 1
    },
    {
      "id": "96070493-f0a4-5b66-83af-035b2b6da1a4",
      "category_id": "55597404-c0f1-5781-bed4-e17113358807",
      "name": "추가비용",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 2
    },
    {
      "id": "e0d03f61-eca3-55fb-a639-72f42bc9e69e",
      "category_id": "6cd62305-a0d6-59eb-a0fa-57093050b791",
      "name": "스드메 기본",
      "estimated_amount": 1500000,
      "actual_amount": 1725000,
      "vendor_name": null,
      "memo": "스냅이랑 같이 1940000 · 원본 견적 150(만원 단위) → 1,500,000원으로 변환",
      "sort_order": 3
    },
    {
      "id": "e81f712f-1ad9-5de9-969d-54466455c93e",
      "category_id": "6cd62305-a0d6-59eb-a0fa-57093050b791",
      "name": "드레스 피팅비",
      "estimated_amount": 200000,
      "actual_amount": 110000,
      "vendor_name": null,
      "memo": "원본 견적 20(만원 단위) → 200,000원으로 변환",
      "sort_order": 4
    },
    {
      "id": "c3077bd6-6cfe-5a48-aa1a-c6a4df6d7cec",
      "category_id": "6cd62305-a0d6-59eb-a0fa-57093050b791",
      "name": "스튜디오 원본",
      "estimated_amount": 400000,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": "원본 견적 40(만원 단위) → 400,000원으로 변환",
      "sort_order": 5
    },
    {
      "id": "c6e19c71-59d6-50cc-bfd0-01a3624f1a3f",
      "category_id": "6cd62305-a0d6-59eb-a0fa-57093050b791",
      "name": "메이크업 얼리비용",
      "estimated_amount": 100000,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": "원본 견적 10(만원 단위) → 100,000원으로 변환",
      "sort_order": 6
    },
    {
      "id": "02a42e7b-fe26-5840-8218-a8f3190a5102",
      "category_id": "6cd62305-a0d6-59eb-a0fa-57093050b791",
      "name": "이모님 헬퍼비",
      "estimated_amount": 200000,
      "actual_amount": 250000,
      "vendor_name": null,
      "memo": "원본 견적 20(만원 단위) → 200,000원으로 변환",
      "sort_order": 7
    },
    {
      "id": "a23342b3-3b3d-5d8d-8959-c8be5ce81621",
      "category_id": "6cd62305-a0d6-59eb-a0fa-57093050b791",
      "name": "사진 추가",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 8
    },
    {
      "id": "ccd01a34-f13b-5dad-ae19-fb43954136e5",
      "category_id": "6cd62305-a0d6-59eb-a0fa-57093050b791",
      "name": "액자",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 9
    },
    {
      "id": "9e13582c-8953-5a57-9d9f-e398e7a6fdd5",
      "category_id": "6cd62305-a0d6-59eb-a0fa-57093050b791",
      "name": "기타",
      "estimated_amount": 100000,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": "원본 견적 10(만원 단위) → 100,000원으로 변환",
      "sort_order": 10
    },
    {
      "id": "a9548d04-f112-58ed-92ab-ba501a60acaa",
      "category_id": "839f0fa1-c599-57db-9001-ef74a3cf9f36",
      "name": "원판 + 스냅",
      "estimated_amount": 500000,
      "actual_amount": 200000,
      "vendor_name": null,
      "memo": "30만원 포인트 차감",
      "sort_order": 11
    },
    {
      "id": "9d78ff60-a53d-50b8-9e39-7a840fce49cc",
      "category_id": "839f0fa1-c599-57db-9001-ef74a3cf9f36",
      "name": "원본사진 받기",
      "estimated_amount": 110000,
      "actual_amount": 110000,
      "vendor_name": null,
      "memo": null,
      "sort_order": 12
    },
    {
      "id": "7aed4e20-09e3-5551-8887-e7a0de383e62",
      "category_id": "afbbba73-4964-5d57-863f-d19e6afcca4f",
      "name": "본식",
      "estimated_amount": 650000,
      "actual_amount": 350000,
      "vendor_name": null,
      "memo": "30만원 포인트 차감",
      "sort_order": 13
    },
    {
      "id": "a5250e90-cf88-562b-b643-ac16f0bde1cb",
      "category_id": "afbbba73-4964-5d57-863f-d19e6afcca4f",
      "name": "1인작가추가",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 14
    },
    {
      "id": "479efeb4-d933-5b7e-8bf4-0f49a77342f8",
      "category_id": "aa897c58-3d29-5d53-96d0-bed41b878c4d",
      "name": "반지비용",
      "estimated_amount": 800000,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 15
    },
    {
      "id": "74c2e315-859b-5b2d-89eb-792714af0fcf",
      "category_id": "aa897c58-3d29-5d53-96d0-bed41b878c4d",
      "name": "추가 비용",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 16
    },
    {
      "id": "e8ce3c82-4a1d-5952-bfa7-1865ea65dbe4",
      "category_id": "027baa05-e920-5ec6-9e66-af9004b46200",
      "name": "결혼식 예복",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 17
    },
    {
      "id": "836e2bd2-1fc5-55f5-ba60-ee5e6ef06fab",
      "category_id": "027baa05-e920-5ec6-9e66-af9004b46200",
      "name": "구두",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 18
    },
    {
      "id": "275289fe-6fb0-5a42-affb-b669aeadb2da",
      "category_id": "027baa05-e920-5ec6-9e66-af9004b46200",
      "name": "촬영용 대여",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 19
    },
    {
      "id": "a9f19e38-2596-5ba5-846a-788c4bf90330",
      "category_id": "75fbe832-fe56-51fa-bd00-88ea23eb62ae",
      "name": "메이크업비",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 20
    },
    {
      "id": "eb4faacc-a3fc-5f6e-8577-31e715396e58",
      "category_id": "7c057e0f-98ed-5c31-905e-a3cbf60695a5",
      "name": "한복대여비",
      "estimated_amount": 400000,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": "원본 견적 40(만원 단위) → 400,000원으로 변환",
      "sort_order": 21
    },
    {
      "id": "a3fbaa0a-12aa-5d5e-a253-cdf01bf25655",
      "category_id": "41788204-be77-5e08-80c9-ed78eea32196",
      "name": "혼주 정장",
      "estimated_amount": 2000000,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": "원본 견적 200(만원 단위) → 2,000,000원으로 변환",
      "sort_order": 22
    },
    {
      "id": "7718f059-68a9-5980-9284-8e0f2dd769aa",
      "category_id": "41788204-be77-5e08-80c9-ed78eea32196",
      "name": "가족 정장",
      "estimated_amount": 500000,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": "원본 견적 50(만원 단위) → 500,000원으로 변환",
      "sort_order": 23
    },
    {
      "id": "3b9c0d29-33bb-5226-85fa-2068873d1001",
      "category_id": "96b6186d-7afd-5542-a26b-67698464351a",
      "name": "비행기(인천 <-> 방콕)",
      "estimated_amount": 1506400,
      "actual_amount": 1506400,
      "vendor_name": null,
      "memo": null,
      "sort_order": 24
    },
    {
      "id": "89e0b290-7997-5bb5-a261-a8cf9f4ca066",
      "category_id": "96b6186d-7afd-5542-a26b-67698464351a",
      "name": "비행기(방콕<-> 코사무이)",
      "estimated_amount": 0,
      "actual_amount": 520000,
      "vendor_name": null,
      "memo": "THB 11530",
      "sort_order": 25
    },
    {
      "id": "cc0bca07-1803-5cbd-9a45-a4fda1d47a38",
      "category_id": "96b6186d-7afd-5542-a26b-67698464351a",
      "name": "숙소",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 26
    },
    {
      "id": "5e0a0888-67d5-5c4a-a4c1-fa6c49a96c3e",
      "category_id": "96b6186d-7afd-5542-a26b-67698464351a",
      "name": "신혼여행비",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 27
    },
    {
      "id": "0f989568-1465-5757-88fa-5c9082ccfbe0",
      "category_id": "2f50c1b9-38db-5076-9d1b-4da391564ec3",
      "name": "상견례 식사",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 28
    },
    {
      "id": "659e2cd4-f6c4-5e52-b43f-889f717fa2fd",
      "category_id": "2f50c1b9-38db-5076-9d1b-4da391564ec3",
      "name": "선물",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 29
    },
    {
      "id": "422a41fb-f168-56c2-adb8-91823f461b37",
      "category_id": "072b2f0d-4df1-5c95-af8e-7f7adfcc61b0",
      "name": "청첩장 제작",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 30
    },
    {
      "id": "895ed7ab-90c0-5afb-b10d-eac7805617b7",
      "category_id": "072b2f0d-4df1-5c95-af8e-7f7adfcc61b0",
      "name": "추가비용",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 31
    },
    {
      "id": "52faa244-017e-5980-bdb2-ae41fca9a9d4",
      "category_id": "ad8fbe7a-913e-5d93-b7f2-b44113396584",
      "name": "신랑",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 32
    },
    {
      "id": "898395ca-f7a2-56bd-b2b9-8723699a2e45",
      "category_id": "ad8fbe7a-913e-5d93-b7f2-b44113396584",
      "name": "신부",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 33
    },
    {
      "id": "81dc8ea1-fb74-5f48-bbce-46e5a57980dc",
      "category_id": "8eddcf6f-7aaf-5e63-a9aa-8cc38efd5696",
      "name": "코디네이터",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 34
    },
    {
      "id": "483abb0e-f52a-5b2c-8a33-06c332e16826",
      "category_id": "8eddcf6f-7aaf-5e63-a9aa-8cc38efd5696",
      "name": "기타 항목",
      "estimated_amount": 0,
      "actual_amount": 0,
      "vendor_name": null,
      "memo": null,
      "sort_order": 35
    },
    {
      "id": "a6e41ad4-91a1-560a-a864-f00418cc8df2",
      "category_id": "0d5c3e8f-7e7b-5133-a81e-20f84f3c031a",
      "name": "야외스냅",
      "estimated_amount": 500000,
      "actual_amount": 310000,
      "vendor_name": null,
      "memo": "20만원 예약금 결제완료, 11만원 당일에 결제하면 됨",
      "sort_order": 36
    },
    {
      "id": "50b82abb-1f3d-59ed-aa9e-46c6112bd3c4",
      "category_id": "aa705e5c-7813-570c-af54-3dbc8fc876fc",
      "name": "스냅 부가비용 (드헤메,소품)",
      "estimated_amount": 250000,
      "actual_amount": 330400,
      "vendor_name": null,
      "memo": "드레스1 : 84,400원 / 드레스2: 12,000원 / 기타소품 14,000원/ 헤메 220,000원/ 부케 43,300원",
      "sort_order": 37
    }
  ],
  "payments": [
    {
      "id": "b9345328-2b73-52d8-a185-bd7d5e447492",
      "budget_item_id": "a6e41ad4-91a1-560a-a864-f00418cc8df2",
      "title": "예약금",
      "amount": 200000,
      "due_date": null,
      "paid": true,
      "paid_at": null,
      "memo": "원본 메모: 20만원 예약금 결제완료"
    },
    {
      "id": "edca106a-1ec7-55e9-9fcf-130cc7b6e036",
      "budget_item_id": "a6e41ad4-91a1-560a-a864-f00418cc8df2",
      "title": "당일 결제",
      "amount": 110000,
      "due_date": null,
      "paid": false,
      "paid_at": null,
      "memo": "원본 메모: 11만원 당일에 결제하면 됨"
    }
  ],
  "vendors": [
    {
      "id": "61039a33-9366-5021-a739-83ce4e8c3e53",
      "category": "coordination",
      "name": "권예인",
      "contact_name": null,
      "phone": "010-8418-0936",
      "url": "인스타 yennple",
      "reserved_date": null,
      "visit_date": null,
      "deposit": 0,
      "balance": 0,
      "total_amount": 0,
      "payment_status": "unpaid",
      "status": "contracted",
      "memo": "웨딩 플래너 · 원본 할 일: 웨딩플래너 정하기 — 진행 중 / 제이웨딩 권예인 플래너",
      "is_favorite": false,
      "details": {
        "role": "웨딩 플래너"
      }
    },
    {
      "id": "ffd6507b-27fd-5441-b480-fac86fc05567",
      "category": "photo",
      "name": "스트롤 스냅",
      "contact_name": null,
      "phone": null,
      "url": null,
      "reserved_date": null,
      "visit_date": "2025-05-22",
      "deposit": 0,
      "balance": 0,
      "total_amount": 310000,
      "payment_status": "unpaid",
      "status": "contracted",
      "memo": "원본 할 일: 스냅사진 정하기 — 완료 / 스트롤 스냅 · 25.05.22 (금) 오후 2시 양화한강공원",
      "is_favorite": false,
      "details": {
        "kind": "outdoor",
        "label": "야외 웨딩스냅",
        "shoot_date": "2025-05-22",
        "shoot_time": "14:00",
        "place": "양화한강공원"
      }
    },
    {
      "id": "409ebfd1-eb4d-5cb0-8d35-c5b51110d820",
      "category": "photo",
      "name": "사계절",
      "contact_name": null,
      "phone": null,
      "url": null,
      "reserved_date": null,
      "visit_date": null,
      "deposit": 0,
      "balance": 0,
      "total_amount": 310000,
      "payment_status": "unpaid",
      "status": "contracted",
      "memo": "원본 할 일: 본식스냅, dvd 정하기 — 완료 / 스냅 : 사계절 · 예산 메모: 포인트로 30만원 차감시 31만원, 아니면 61만원",
      "is_favorite": false,
      "details": {
        "kind": "snap",
        "label": "본식 스냅",
        "shoot_date": null,
        "shoot_time": null,
        "place": null
      }
    },
    {
      "id": "671e6859-0c4f-540b-bef6-50ef7acb778e",
      "category": "photo",
      "name": "에이딘룩",
      "contact_name": null,
      "phone": null,
      "url": null,
      "reserved_date": null,
      "visit_date": null,
      "deposit": 0,
      "balance": 0,
      "total_amount": 350000,
      "payment_status": "unpaid",
      "status": "contracted",
      "memo": "원본 할 일: 본식스냅, dvd 정하기 — 완료 / dvd : 에이딘룩 · 예산 메모: 포인트로 30만원 차감시 35만원, 아니면 65만원",
      "is_favorite": false,
      "details": {
        "kind": "video",
        "label": "본식 DVD",
        "shoot_date": null,
        "shoot_time": null,
        "place": null
      }
    },
    {
      "id": "f9025590-06b6-5c50-b97b-4f0286a8f32e",
      "category": "beauty",
      "name": "뷰티진동희",
      "contact_name": null,
      "phone": null,
      "url": null,
      "reserved_date": null,
      "visit_date": null,
      "deposit": 0,
      "balance": 0,
      "total_amount": 0,
      "payment_status": "unpaid",
      "status": "contracted",
      "memo": "원본 할 일: 헤어샵 구하기 — 완료 / 메이크업샵 구하기 — 완료",
      "is_favorite": false,
      "details": {
        "scope": "신부 헤어·메이크업"
      }
    },
    {
      "id": "a3a6c8d8-c1b5-58d2-9986-e58f6e1d74d9",
      "category": "beauty",
      "name": "메이크업101",
      "contact_name": null,
      "phone": null,
      "url": null,
      "reserved_date": null,
      "visit_date": null,
      "deposit": 0,
      "balance": 0,
      "total_amount": 0,
      "payment_status": "unpaid",
      "status": "contracted",
      "memo": "원본 할 일: 양가 어머님 본식 메이크업 — 완료 / 우리집: 메이크업101",
      "is_favorite": false,
      "details": {
        "scope": "혼주(신부측) 메이크업"
      }
    },
    {
      "id": "6990faf5-fbe8-5163-95a0-bfd0a1f7c6ea",
      "category": "beauty",
      "name": "w아틀리에",
      "contact_name": null,
      "phone": null,
      "url": null,
      "reserved_date": null,
      "visit_date": null,
      "deposit": 0,
      "balance": 0,
      "total_amount": 0,
      "payment_status": "unpaid",
      "status": "contracted",
      "memo": "원본 할 일: 양가 어머님 본식 메이크업 — 완료 / 어머님: w아틀리에",
      "is_favorite": false,
      "details": {
        "scope": "혼주(신랑측) 메이크업"
      }
    }
  ],
  "venues": [
    {
      "id": "f9b26a5c-d977-5c0c-8b58-1f521b549f53",
      "name": "연대 동문회관 예식장",
      "address": null,
      "event_date": "2026-12-21",
      "event_time": "13:00",
      "is_contracted": true,
      "deposit": 0,
      "balance": 0,
      "hall_fee": 5000000,
      "meal_cost": 0,
      "guaranteed_guests": 0,
      "expected_guests": 0,
      "parking": null,
      "transport": null,
      "notes": "원본 할 일: 웨딩홀 정하기 — 완료 / 연대 동문회관 예식장",
      "contact_name": null,
      "phone": null,
      "url": null,
      "memo": "장소 대관료(기부금) 5,000,000원 · 250만원 엄마가 내줄듯?",
      "is_favorite": true
    },
    {
      "id": "c0d3d478-23ae-59b8-b5af-0c65a804287e",
      "name": "노블발렌티 삼성",
      "address": null,
      "event_date": null,
      "event_time": null,
      "is_contracted": false,
      "deposit": 0,
      "balance": 0,
      "hall_fee": 0,
      "meal_cost": 0,
      "guaranteed_guests": 0,
      "expected_guests": 0,
      "parking": null,
      "transport": null,
      "notes": null,
      "contact_name": null,
      "phone": null,
      "url": "https://search.naver.com/search.naver?where=image&sm=tab_jum&query=%EB%85%B8%EB%B8%94%EB%B0%9C%EB%A0%8C%ED%8B%B0+%EC%82%BC%EC%84%B1",
      "memo": "원본 '식장' 시트의 사진 링크에서 이관된 후보",
      "is_favorite": false
    },
    {
      "id": "dd245d86-f0f0-5c83-8082-1a4d6bb16bc6",
      "name": "더채플앳논현",
      "address": null,
      "event_date": null,
      "event_time": null,
      "is_contracted": false,
      "deposit": 0,
      "balance": 0,
      "hall_fee": 0,
      "meal_cost": 0,
      "guaranteed_guests": 0,
      "expected_guests": 0,
      "parking": null,
      "transport": null,
      "notes": null,
      "contact_name": null,
      "phone": null,
      "url": "https://search.naver.com/search.naver?sm=tab_sug.top&where=image&query=%EB%8D%94%EC%B1%84%ED%94%8C%EC%95%B3%EB%85%BC%ED%98%84&oquery=%EB%85%B8%EB%B8%94%EB%B0%9C%EB%A0%8C%ED%8B%B0+%EC%82%BC%EC%84%B1&tqi=h2WKtlprvTosseezT28ssssss3h-440360&acq=%EB%8D%94%EC%B1%84&acr=1&qdt=0",
      "memo": "원본 '식장' 시트의 사진 링크에서 이관된 후보",
      "is_favorite": false
    },
    {
      "id": "ef2037b3-4d21-51a5-92c6-064f0b4f73af",
      "name": "브라이드밸리강남",
      "address": null,
      "event_date": null,
      "event_time": null,
      "is_contracted": false,
      "deposit": 0,
      "balance": 0,
      "hall_fee": 0,
      "meal_cost": 0,
      "guaranteed_guests": 0,
      "expected_guests": 0,
      "parking": null,
      "transport": null,
      "notes": null,
      "contact_name": null,
      "phone": null,
      "url": "https://search.naver.com/search.naver?sm=tab_hty.top&where=image&query=%EB%B8%8C%EB%9D%BC%EC%9D%B4%EB%93%9C%EB%B0%B8%EB%A6%AC%EA%B0%95%EB%82%A8&oquery=%EB%8D%94%EC%B1%84%ED%94%8C%EC%95%B3%EB%85%BC%ED%98%84&tqi=h2WLVdprvTossePOwkGssssssmG-224650",
      "memo": "원본 '식장' 시트의 사진 링크에서 이관된 후보",
      "is_favorite": false
    },
    {
      "id": "edea4c3b-9a0a-5995-a376-543865d885e1",
      "name": "아펠가모 선릉",
      "address": null,
      "event_date": null,
      "event_time": null,
      "is_contracted": false,
      "deposit": 0,
      "balance": 0,
      "hall_fee": 0,
      "meal_cost": 0,
      "guaranteed_guests": 0,
      "expected_guests": 0,
      "parking": null,
      "transport": null,
      "notes": null,
      "contact_name": null,
      "phone": null,
      "url": "https://search.naver.com/search.naver?sm=tab_hty.top&where=image&query=%EC%95%84%ED%8E%A0%EA%B0%80%EB%AA%A8+%EC%84%A0%EB%A6%89&oquery=%EC%95%84%ED%8E%A0%EA%B0%80%EB%AA%A8+%EC%84%A0%ED%9D%A5&tqi=h2WdRsprvTosse54wlwssssstM8-086639",
      "memo": "원본 '식장' 시트의 사진 링크에서 이관된 후보",
      "is_favorite": false
    },
    {
      "id": "f9ef2225-5242-5ee5-9bbf-7ea77fe97f9a",
      "name": "소노펠리체 컨벤션",
      "address": null,
      "event_date": null,
      "event_time": null,
      "is_contracted": false,
      "deposit": 0,
      "balance": 0,
      "hall_fee": 0,
      "meal_cost": 0,
      "guaranteed_guests": 0,
      "expected_guests": 0,
      "parking": null,
      "transport": null,
      "notes": null,
      "contact_name": null,
      "phone": null,
      "url": "https://search.naver.com/search.naver?sm=tab_hty.top&where=image&query=%EC%86%8C%EB%85%B8%ED%8E%A0%EB%A6%AC%EC%B2%B4+%EC%BB%A8%EB%B2%A4%EC%85%98&oquery=%EC%86%8C%EB%85%B8%ED%8E%A0%EB%A6%AC%EC%B2%B4+%EB%8D%B8%ED%94%BC%EB%85%B8&tqi=h2WfCdprvTosseRSmgKsssssst4-389992",
      "memo": "원본 '식장' 시트의 사진 링크에서 이관된 후보",
      "is_favorite": false
    },
    {
      "id": "fa706e90-8bbb-5917-8fd9-17ba3fb8b251",
      "name": "엘블레스",
      "address": null,
      "event_date": null,
      "event_time": null,
      "is_contracted": false,
      "deposit": 0,
      "balance": 0,
      "hall_fee": 0,
      "meal_cost": 0,
      "guaranteed_guests": 0,
      "expected_guests": 0,
      "parking": null,
      "transport": null,
      "notes": null,
      "contact_name": null,
      "phone": null,
      "url": "https://search.naver.com/search.naver?sm=tab_hty.top&where=nexearch&query=%EC%97%98%EB%B8%94%EB%A0%88%EC%8A%A4&oquery=%EB%B8%8C%EB%9D%BC%EC%9D%B4%EB%93%9C%EB%B0%B8%EB%A6%AC&tqi=h2WxQsp0J1sssLRaQW0ssssstaK-448335",
      "memo": "원본 '식장' 시트의 사진 링크에서 이관된 후보",
      "is_favorite": false
    }
  ],
  "honeymoon": [
    {
      "id": "f5fc8f43-c803-5b54-ba3e-5a18354f306e",
      "country": "태국",
      "city": "방콕 · 코사무이",
      "depart_date": "2026-12-22",
      "return_date": "2026-12-29",
      "flight_info": "12.22 대한항공 / 12.24 방콕 에어웨이 11:55~13:05 <-> 14:05~15:20",
      "flight_booked": true,
      "flight_booking_no": null,
      "hotel_name": "코사무이 wild cottage elephant sanctuary / 실라바디 풀 스파 리조트",
      "hotel_booked": true,
      "hotel_booking_no": null,
      "cost": 2026400,
      "memo": "원본 할 일: 비행기 예약 완료 / 숙소 예약 완료 · 코사무이 wild cottage elephant sanctuary 2026.12.23~2026.12.24, 실라바디 풀 스파 리조트 2026.12.24~2026.12.25"
    }
  ],
  "honeymoon_items": [
    {
      "id": "8a1aaf75-530e-5562-b072-e027d5ac0246",
      "kind": "itinerary",
      "title": "방콕 체류",
      "date": "2026-12-22",
      "time": null,
      "done": false,
      "memo": "~ 2026-12-23 · 항공 1,506,400원 · 놀",
      "sort_order": 0
    },
    {
      "id": "8e525680-7e83-5000-be7e-6f362e6540b5",
      "kind": "itinerary",
      "title": "코사무이 체류",
      "date": "2026-12-23",
      "time": null,
      "done": false,
      "memo": "~ 2026-12-26 · 항공 520,000원 · Bangkok Airways · https://allhoneytip.com/%EC%99%80%EC%9D%BC%EB%93%9C-%EC%BD%94%ED%8B%B0%EC%A7%80-%EC%97%98%EB%A6%AC%ED%8E%80%ED%8A%B8-%EC%83%9D%EC%B6%94%EC%96%B4%EB%A6%AC-%EC%BD%94%EC%82%AC%EB%AC%B4%EC%9D%B4-%EB%A6%AC%EC%A1%B0%ED%8A%B8/",
      "sort_order": 1
    },
    {
      "id": "208461e3-5a60-5947-b793-ee5898b2ec8c",
      "kind": "itinerary",
      "title": "방콕 체류",
      "date": "2026-12-26",
      "time": null,
      "done": false,
      "memo": "~ 2026-12-29 · 놀",
      "sort_order": 2
    },
    {
      "id": "996c8cad-d00f-58b1-96ca-35e182305d34",
      "kind": "itinerary",
      "title": "wild cottage elephant sanctuary 숙박",
      "date": "2026-12-23",
      "time": null,
      "done": false,
      "memo": "원본 할 일 메모: 2026.12.23~2026.12.24",
      "sort_order": 10
    },
    {
      "id": "ae2bf3e7-32a7-5f14-9e13-a68866521dc4",
      "kind": "itinerary",
      "title": "실라바디 풀 스파 리조트 숙박",
      "date": "2026-12-24",
      "time": null,
      "done": false,
      "memo": "원본 할 일 메모: 2026.12.24~2026.12.25",
      "sort_order": 11
    },
    {
      "id": "cbf465c3-f4b2-5785-a1c4-5479c3ef6394",
      "kind": "checklist",
      "title": "여행일정 짜기",
      "date": null,
      "time": null,
      "done": false,
      "memo": "원본 할 일: 시작하지 않음",
      "sort_order": 0
    }
  ],
  "music_items": [],
  "outfit_items": [
    {
      "id": "66655125-02ad-5299-84bb-5893dc461cf7",
      "kind": "예복",
      "vendor_name": "아틀레",
      "reserve_date": null,
      "fitting_date": "2026-10-03",
      "pickup_date": null,
      "cost": 980000,
      "is_paid": false,
      "memo": "스냅 대여 포함 · 원본 할 일: 04.11(토) 맞추러 가기(야외스냅) / 10.03 오후 1시 본식 예복 맞추기",
      "is_favorite": false
    },
    {
      "id": "c3880402-1a7d-562f-9d28-bcdbb979787b",
      "kind": "신부 드레스",
      "vendor_name": "크리드제이 / 디아일",
      "reserve_date": null,
      "fitting_date": "2026-08-21",
      "pickup_date": null,
      "cost": 0,
      "is_paid": false,
      "memo": "원본 할 일: 드레스 정하기 — 완료 / 크리드제이·디아일 드투 8.21(금)",
      "is_favorite": false
    }
  ],
  "guests": [
    {
      "id": "29642662-006e-5078-a1be-66a7fa9551d6",
      "name": "이성일 부장님",
      "side": "bride",
      "relation": "직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": true,
      "invitation_method": "paper",
      "memo": null
    },
    {
      "id": "3dd64deb-8462-57ec-b24b-7d6665c71671",
      "name": "김정민 과장님",
      "side": "bride",
      "relation": "직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "c1810f43-cc42-5b29-857d-ff334b6382f7",
      "name": "지동혁 과장님",
      "side": "bride",
      "relation": "직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "6d1af061-f2b5-5472-b0b8-52d75e752c64",
      "name": "조정민 대리님",
      "side": "bride",
      "relation": "직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "6d53745e-4cb8-570e-873c-16ee77e162f6",
      "name": "김보경 대리님",
      "side": "bride",
      "relation": "직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "fbeb7a58-c9d1-552b-a8bb-7c3753edb67a",
      "name": "정다경 대리님",
      "side": "bride",
      "relation": "직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "ff35f008-b012-535f-b2fe-2b7382ba2943",
      "name": "강재순 대리님",
      "side": "bride",
      "relation": "직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "6c1b0960-4382-5109-acda-59d0eef4e63b",
      "name": "김정섭 팀장님",
      "side": "bride",
      "relation": "직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "943b1495-337c-5c1b-b106-11a51bad2e56",
      "name": "김현지",
      "side": "bride",
      "relation": "학교 동창",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "4a89193a-1207-5e14-a44b-4f9b4e97d612",
      "name": "문경지",
      "side": "bride",
      "relation": "학교 동창",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "797792af-9f64-57a5-99c8-efa1e183cc8c",
      "name": "이가람",
      "side": "bride",
      "relation": "학교 동창",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "c8567032-6122-5130-83f3-7ef64d7a03c1",
      "name": "서유리",
      "side": "bride",
      "relation": "학교 동창",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "f05dc242-e1d6-5125-baa0-e966b833519c",
      "name": "김아름",
      "side": "bride",
      "relation": "학교 동창",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "dcad433f-e41d-569c-9d59-607e2e275676",
      "name": "김현주",
      "side": "bride",
      "relation": "학교 동창",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "c90dbb3b-1beb-5834-ade7-6a3bf19461fe",
      "name": "최정은",
      "side": "bride",
      "relation": "학교 동창",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "b9f4602c-7b59-5569-bf1c-7f7a12c27d59",
      "name": "윤은지",
      "side": "bride",
      "relation": "학교 동창",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "3bea947f-bae6-5305-a6f0-ff72c10de62c",
      "name": "김지윤",
      "side": "bride",
      "relation": "학교 동창",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "aee4d297-c661-5dc1-a6fa-873a79354905",
      "name": "문서진",
      "side": "bride",
      "relation": "학교 동창",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "24333512-5e67-5538-892e-7ed3eb4c83b5",
      "name": "강래원 오빠",
      "side": "groom",
      "relation": null,
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "ad768c31-091e-5151-a54c-c78dfe5047f5",
      "name": "심서경 언니",
      "side": "groom",
      "relation": null,
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "49384f6d-43e7-583e-a24c-ef7263258356",
      "name": "이지언 언니",
      "side": "groom",
      "relation": null,
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "a038ad77-225d-5b3a-bdd4-a78b55270278",
      "name": "진명준 오빠",
      "side": "groom",
      "relation": null,
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "fa8a924b-149a-5b6d-b1a1-eb8a9a17b7e4",
      "name": "김해림",
      "side": "groom",
      "relation": null,
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "3cc87cd4-43f4-5d7a-a010-7c7b6715050b",
      "name": "이태근",
      "side": "groom",
      "relation": null,
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "e9b52d40-a87b-5533-8d9f-2f4db50c1d02",
      "name": "공윤재",
      "side": "bride",
      "relation": "소모임 친구",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "c6a62c6e-d1d1-5550-a600-bc6617627684",
      "name": "조윤수 오빠",
      "side": "bride",
      "relation": "전 직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "e20f0dee-b7e0-564d-ad0d-8e9e2cc57cc8",
      "name": "이소희",
      "side": "bride",
      "relation": "전 직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "6afcf138-909c-58fb-8198-f2511a4c3d65",
      "name": "재원",
      "side": "bride",
      "relation": "전 직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "b9f0196b-9ef6-5101-8ae3-2dff6e4199c2",
      "name": "정현",
      "side": "bride",
      "relation": "전 직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "384f008c-8435-5a2f-b0f6-ec116f000a1f",
      "name": "이소희 언니",
      "side": "bride",
      "relation": "전 직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "949ec0d8-b8fe-551b-8c9f-7b35af359b65",
      "name": "최가연 언니",
      "side": "bride",
      "relation": "전 직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "3d6c2149-f0f6-5d4d-a385-c566d5e5c2bb",
      "name": "김이슬 언니",
      "side": "bride",
      "relation": "전 직장동료",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "92870181-1981-5bc7-aac2-523ec2ac76a8",
      "name": "주지한",
      "side": "groom",
      "relation": null,
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "ce6efc55-5a53-5452-9bb4-362f78b4294f",
      "name": "이다희 언니",
      "side": "groom",
      "relation": null,
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "eb8bc1ad-144d-5b74-841a-35a2d60b1451",
      "name": "이기욱",
      "side": "groom",
      "relation": null,
      "rsvp": "no",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": "원본 표기: 이기욱(못옴)"
    },
    {
      "id": "a4f57f2c-6287-5309-9915-12e3a2f63994",
      "name": "이창준",
      "side": "groom",
      "relation": null,
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "99b3afd3-e5c4-56b0-8a21-3011a60bdead",
      "name": "김재룡 언니",
      "side": "bride",
      "relation": "영어학원",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "f7b7a70a-d21f-510a-bc37-79cc6b86501a",
      "name": "노철환 오빠",
      "side": "bride",
      "relation": "영어학원",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "b6c64008-a917-5d43-b1ed-e9bf8d008e45",
      "name": "구제빈",
      "side": "groom",
      "relation": "친구",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "d610ca42-a417-59c4-906e-90e80e856e99",
      "name": "장원",
      "side": "groom",
      "relation": "친구",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "93125977-8a7d-584b-8c5e-1ab727b11ba7",
      "name": "서주성",
      "side": "groom",
      "relation": "친구",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "a2239c4e-4090-57f2-b2c1-cc7e6e946274",
      "name": "김봄이",
      "side": "groom",
      "relation": "친구",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    },
    {
      "id": "0888e4a8-cd18-52ab-b963-c0af217edda6",
      "name": "진주리",
      "side": "groom",
      "relation": "친구",
      "rsvp": "maybe",
      "companions": 0,
      "meal": "unknown",
      "contacted": false,
      "invitation_sent": false,
      "invitation_method": null,
      "memo": null
    }
  ],
  "invitation_meetings": [],
  "gifts": [],
  "events": [],
  "memos": [
    {
      "id": "c920b226-b9df-5672-b833-e3c0f5d113d6",
      "content": "원본 '시트8'(월 생활비 메모)\n150\n생활비 83 할부 37\n월세 60\n수영 8\n교통비 6\n통신비 9\n25\n58\n머리 5\n점심식대 24\n데이트비용 15\n커피 5\n비타민 6\n양배추즙 3",
      "converted_to": null
    }
  ]
};

export type OriginalTable = keyof typeof ORIGINAL_ROWS;
export const ORIGINAL_TOTALS = {
  tasks: 28, budget_categories: 16, budget_items: 38,
  payments: 2, vendors: 7, venues: 7,
  honeymoon_items: 6, outfit_items: 2, guests: 43, memos: 1,
} as const;
export type { WeddingData };
