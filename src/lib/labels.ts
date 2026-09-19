import type {
  Assignee,
  EventType,
  InvitationMethod,
  MealChoice,
  MeetingStatus,
  MusicSlot,
  PaymentStatus,
  Rsvp,
  TaskPriority,
  TaskStatus,
  VendorCategory,
  VendorStatus,
} from "@/lib/db/types";

export type Option<T extends string> = { value: T; label: string };

export const TASK_STATUS: Option<TaskStatus>[] = [
  { value: "todo", label: "시작 전" },
  { value: "doing", label: "진행 중" },
  { value: "waiting", label: "대기" },
  { value: "done", label: "완료" },
];
export const TASK_STATUS_LABEL = Object.fromEntries(TASK_STATUS.map((o) => [o.value, o.label])) as Record<TaskStatus, string>;

export const TASK_PRIORITY: Option<TaskPriority>[] = [
  { value: "high", label: "중요" },
  { value: "normal", label: "보통" },
  { value: "low", label: "낮음" },
];
export const TASK_PRIORITY_LABEL = Object.fromEntries(TASK_PRIORITY.map((o) => [o.value, o.label])) as Record<TaskPriority, string>;

export const ASSIGNEE: Option<Assignee>[] = [
  { value: "both", label: "함께" },
  { value: "groom", label: "신랑" },
  { value: "bride", label: "신부" },
];
export const ASSIGNEE_LABEL = Object.fromEntries(ASSIGNEE.map((o) => [o.value, o.label])) as Record<Assignee, string>;

export const TASK_CATEGORIES = [
  "식장",
  "스드메",
  "신혼여행",
  "예복",
  "헤어&메이크업",
  "부케",
  "사진/영상",
  "청첩장",
  "하객",
  "선물",
  "예산",
  "혼수",
  "상견례",
  "기타",
];

export const RSVP: Option<Rsvp>[] = [
  { value: "yes", label: "참석" },
  { value: "maybe", label: "미정" },
  { value: "no", label: "불참" },
];
export const RSVP_LABEL = Object.fromEntries(RSVP.map((o) => [o.value, o.label])) as Record<Rsvp, string>;

export const MEAL: Option<MealChoice>[] = [
  { value: "yes", label: "식사" },
  { value: "no", label: "식사 안 함" },
  { value: "unknown", label: "미정" },
];

export const INVITATION_METHOD: Option<InvitationMethod>[] = [
  { value: "mobile", label: "모바일" },
  { value: "paper", label: "종이" },
  { value: "both", label: "둘 다" },
];

export const GUEST_RELATIONS = ["가족", "친척", "친구", "직장", "학교", "지인", "부모님 지인", "기타"];

export const MEETING_STATUS: Option<MeetingStatus>[] = [
  { value: "planned", label: "예정" },
  { value: "done", label: "완료" },
  { value: "canceled", label: "취소" },
];
export const MEETING_STATUS_LABEL = Object.fromEntries(MEETING_STATUS.map((o) => [o.value, o.label])) as Record<MeetingStatus, string>;

export const VENDOR_STATUS: Option<VendorStatus>[] = [
  { value: "candidate", label: "후보" },
  { value: "contracted", label: "계약" },
  { value: "done", label: "완료" },
];
export const VENDOR_STATUS_LABEL = Object.fromEntries(VENDOR_STATUS.map((o) => [o.value, o.label])) as Record<VendorStatus, string>;

export const PAYMENT_STATUS: Option<PaymentStatus>[] = [
  { value: "unpaid", label: "미결제" },
  { value: "deposit", label: "계약금" },
  { value: "paid", label: "완납" },
];
export const PAYMENT_STATUS_LABEL = Object.fromEntries(PAYMENT_STATUS.map((o) => [o.value, o.label])) as Record<PaymentStatus, string>;

export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> = {
  beauty: "헤어 & 메이크업",
  bouquet: "부케",
  photo: "사진 / 영상",
  coordination: "코디네이션",
  other: "기타 업체",
};

export const MUSIC_SLOT: Option<MusicSlot>[] = [
  { value: "pre", label: "식전 음악" },
  { value: "groom_entry", label: "신랑 입장" },
  { value: "bride_entry", label: "신부 입장" },
  { value: "parents_entry", label: "부모님 입장" },
  { value: "song", label: "축가" },
  { value: "march", label: "행진" },
  { value: "other", label: "기타" },
];
export const MUSIC_SLOT_LABEL = Object.fromEntries(MUSIC_SLOT.map((o) => [o.value, o.label])) as Record<MusicSlot, string>;

export const OUTFIT_KINDS = ["신랑 예복", "신부 드레스", "2부 드레스", "한복", "구두", "액세서리", "기타"];

export const EVENT_TYPE: Option<EventType>[] = [
  { value: "task", label: "할 일" },
  { value: "fitting", label: "피팅" },
  { value: "visit", label: "방문" },
  { value: "shoot", label: "촬영" },
  { value: "meeting", label: "모임" },
  { value: "payment", label: "결제" },
  { value: "appointment", label: "약속" },
  { value: "travel", label: "여행" },
  { value: "wedding", label: "결혼식" },
  { value: "other", label: "기타" },
];
export const EVENT_TYPE_LABEL = Object.fromEntries(EVENT_TYPE.map((o) => [o.value, o.label])) as Record<EventType, string>;

export const ENTITY_LABEL: Record<string, string> = {
  tasks: "할 일",
  budget_categories: "예산 카테고리",
  budget_items: "예산 항목",
  payments: "결제",
  vendors: "업체",
  venues: "식장",
  honeymoon: "신혼여행",
  honeymoon_items: "신혼여행 항목",
  music_items: "음악",
  outfit_items: "예복",
  guests: "하객",
  invitation_meetings: "청첩장 모임",
  gifts: "선물",
  events: "일정",
  memos: "메모",
  attachments: "첨부파일",
  wedding: "결혼 정보",
};
