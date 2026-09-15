import type { VendorCategory } from "@/lib/db/types";
import { PAYMENT_STATUS, VENDOR_STATUS } from "@/lib/labels";
import type { FieldDef } from "@/components/shared/SchemaForm";

export interface VendorPageConfig {
  category: VendorCategory;
  title: string;
  description: string;
  addLabel: string;
  emptyTitle: string;
  emptyDesc: string;
  extraFields: FieldDef[];
}

const COMMON_TOP: FieldDef[] = [
  { key: "name", label: "업체명", type: "text", required: true },
  { key: "status", label: "진행 상태", type: "segmented", options: VENDOR_STATUS },
  { key: "contact_name", label: "담당자", type: "text", half: true },
  { key: "phone", label: "연락처", type: "phone", half: true },
  { key: "reserved_date", label: "예약일", type: "date", half: true },
  { key: "visit_date", label: "방문일", type: "date", half: true },
];
const COMMON_MONEY: FieldDef[] = [
  { key: "total_amount", label: "총금액", type: "money" },
  { key: "deposit", label: "계약금", type: "money", half: true },
  { key: "balance", label: "잔금", type: "money", half: true },
  { key: "payment_status", label: "결제 상태", type: "segmented", options: PAYMENT_STATUS },
];
const COMMON_BOTTOM: FieldDef[] = [
  { key: "url", label: "URL", type: "url" },
  { key: "memo", label: "메모", type: "textarea" },
];

export const VENDOR_PAGES: Record<Exclude<VendorCategory, "other">, VendorPageConfig> = {
  beauty: {
    category: "beauty",
    title: "헤어 & 메이크업",
    description: "샵 후보, 리허설, 본식 당일 시간까지",
    addLabel: "샵 추가",
    emptyTitle: "아직 등록된 헤어 & 메이크업 샵이 없어요",
    emptyDesc: "후보 샵을 등록하고 리허설 · 본식 시간을 기록해 두세요.",
    extraFields: [
      { key: "details.designer", label: "담당 디자이너", type: "text" },
      { key: "details.rehearsal_date", label: "리허설 일자", type: "date", half: true },
      { key: "details.wedding_start_time", label: "본식 시작 시간", type: "time", half: true },
      { key: "details.on_site", label: "출장 여부", type: "toggle", hint: "식장으로 출장 오는지" },
      { key: "details.includes", label: "포함 대상", type: "text", placeholder: "예: 신부, 신랑, 혼주 2명" },
    ],
  },
  bouquet: {
    category: "bouquet",
    title: "부케",
    description: "꽃 종류와 수령 방법을 정리해요",
    addLabel: "업체 추가",
    emptyTitle: "아직 등록된 부케 업체가 없어요",
    emptyDesc: "원하는 꽃 종류와 컬러, 수령 방법을 함께 기록해 보세요.",
    extraFields: [
      { key: "details.flowers", label: "꽃 종류 / 컬러", type: "text", placeholder: "예: 화이트 라넌큘러스 + 그린" },
      { key: "details.boutonniere", label: "부토니에 포함", type: "toggle" },
      { key: "details.delivery", label: "수령 방법", type: "chips", options: [{ value: "venue", label: "식장 배송" }, { value: "pickup", label: "직접 수령" }] },
      { key: "details.pickup_date", label: "수령일", type: "date" },
    ],
  },
  photo: {
    category: "photo",
    title: "사진 / 영상",
    description: "스튜디오, 본식 스냅, 영상 업체",
    addLabel: "업체 추가",
    emptyTitle: "아직 등록된 사진 · 영상 업체가 없어요",
    emptyDesc: "스튜디오 촬영, 본식 스냅, 영상(DVD) 업체를 각각 등록해 보세요.",
    extraFields: [
      { key: "details.kind", label: "종류", type: "chips", options: [{ value: "studio", label: "스튜디오" }, { value: "snap", label: "본식 스냅" }, { value: "video", label: "본식 영상" }, { value: "outdoor", label: "야외 촬영" }, { value: "dvd", label: "DVD" }] },
      { key: "details.shoot_date", label: "촬영일", type: "date", half: true },
      { key: "details.shoot_time", label: "촬영 시간", type: "time", half: true },
      { key: "details.delivery_date", label: "보정본 수령 예정", type: "date" },
      { key: "details.originals", label: "원본 제공", type: "toggle" },
      { key: "details.options", label: "옵션 / 컷 수", type: "text", placeholder: "예: 보정 30컷, 원본 전체" },
    ],
  },
  coordination: {
    category: "coordination",
    title: "코디네이션",
    description: "플래너, 헬퍼, 드레스 투어 등",
    addLabel: "업체 추가",
    emptyTitle: "아직 등록된 코디 업체가 없어요",
    emptyDesc: "웨딩플래너, 헬퍼 이모님, 드레스 투어 업체를 등록해 보세요.",
    extraFields: [
      { key: "details.service", label: "서비스 종류", type: "chips", options: [{ value: "planner", label: "웨딩플래너" }, { value: "helper", label: "헬퍼" }, { value: "dress_tour", label: "드레스 투어" }, { value: "styling", label: "스타일링" }] },
      { key: "details.planner", label: "담당 플래너", type: "text" },
      { key: "details.meeting_date", label: "미팅일", type: "date" },
      { key: "details.included", label: "포함 서비스", type: "textarea", placeholder: "예: 스드메 동행, 본식 진행, 사회자 섭외" },
    ],
  },
};

export function vendorFields(cfg: VendorPageConfig): FieldDef[] {
  return [...COMMON_TOP, ...cfg.extraFields, ...COMMON_MONEY, ...COMMON_BOTTOM];
}
