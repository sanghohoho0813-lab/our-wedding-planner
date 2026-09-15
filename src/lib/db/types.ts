export type UUID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string;

export interface BaseRow {
  id: UUID;
  wedding_id: UUID;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface Wedding {
  id: UUID;
  name: string;
  wedding_date: ISODate;
  wedding_time: string | null;
  groom_name: string;
  bride_name: string;
  total_budget: number;
  invite_code: string;
  created_by: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export type TaskStatus = "todo" | "doing" | "waiting" | "done";
export type TaskPriority = "high" | "normal" | "low";
export type Assignee = "groom" | "bride" | "both";

export interface Task extends BaseRow {
  title: string;
  category: string | null;
  due_date: ISODate | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: Assignee;
  memo: string | null;
  vendor_id: UUID | null;
  budget_item_id: UUID | null;
  is_favorite: boolean;
  completed_at: ISODateTime | null;
  sort_order: number;
}

export interface BudgetCategory extends BaseRow {
  name: string;
  icon: string | null;
  sort_order: number;
  planned_amount: number;
}

export interface BudgetItem extends BaseRow {
  category_id: UUID | null;
  name: string;
  estimated_amount: number;
  actual_amount: number;
  vendor_name: string | null;
  vendor_id: UUID | null;
  memo: string | null;
  is_favorite: boolean;
  sort_order: number;
}

export interface Payment extends BaseRow {
  budget_item_id: UUID;
  title: string;
  amount: number;
  due_date: ISODate | null;
  paid: boolean;
  paid_at: ISODate | null;
  memo: string | null;
}

export type VendorCategory =
  | "beauty"
  | "bouquet"
  | "photo"
  | "coordination"
  | "other";
export type VendorStatus = "candidate" | "contracted" | "done";
export type PaymentStatus = "unpaid" | "deposit" | "paid";

export interface Vendor extends BaseRow {
  category: VendorCategory;
  name: string;
  contact_name: string | null;
  phone: string | null;
  url: string | null;
  reserved_date: ISODate | null;
  visit_date: ISODate | null;
  deposit: number;
  balance: number;
  total_amount: number;
  payment_status: PaymentStatus;
  status: VendorStatus;
  memo: string | null;
  is_favorite: boolean;
  details: Record<string, unknown>;
}

export interface Venue extends BaseRow {
  name: string;
  address: string | null;
  event_date: ISODate | null;
  event_time: string | null;
  is_contracted: boolean;
  deposit: number;
  balance: number;
  hall_fee: number;
  meal_cost: number;
  guaranteed_guests: number;
  expected_guests: number;
  parking: string | null;
  transport: string | null;
  notes: string | null;
  contact_name: string | null;
  phone: string | null;
  url: string | null;
  memo: string | null;
  is_favorite: boolean;
}

export interface Honeymoon extends BaseRow {
  country: string | null;
  city: string | null;
  depart_date: ISODate | null;
  return_date: ISODate | null;
  flight_info: string | null;
  flight_booked: boolean;
  flight_booking_no: string | null;
  hotel_name: string | null;
  hotel_booked: boolean;
  hotel_booking_no: string | null;
  cost: number;
  memo: string | null;
}

export type HoneymoonItemKind = "itinerary" | "checklist";
export interface HoneymoonItem extends BaseRow {
  kind: HoneymoonItemKind;
  title: string;
  date: ISODate | null;
  time: string | null;
  done: boolean;
  memo: string | null;
  sort_order: number;
}

export type MusicSlot =
  | "pre"
  | "groom_entry"
  | "bride_entry"
  | "parents_entry"
  | "song"
  | "march"
  | "other";
export interface MusicItem extends BaseRow {
  slot: MusicSlot;
  title: string;
  artist: string | null;
  url: string | null;
  section: string | null;
  is_confirmed: boolean;
  memo: string | null;
  sort_order: number;
}

export interface OutfitItem extends BaseRow {
  kind: string;
  vendor_name: string | null;
  reserve_date: ISODate | null;
  fitting_date: ISODate | null;
  pickup_date: ISODate | null;
  cost: number;
  is_paid: boolean;
  memo: string | null;
  is_favorite: boolean;
}

export type GuestSide = "groom" | "bride";
export type Rsvp = "yes" | "maybe" | "no";
export type MealChoice = "yes" | "no" | "unknown";
export type InvitationMethod = "mobile" | "paper" | "both";

export interface Guest extends BaseRow {
  name: string;
  side: GuestSide;
  relation: string | null;
  rsvp: Rsvp;
  companions: number;
  meal: MealChoice;
  contacted: boolean;
  invitation_sent: boolean;
  invitation_method: InvitationMethod | null;
  memo: string | null;
}

export type MeetingStatus = "planned" | "done" | "canceled";
export interface InvitationMeeting extends BaseRow {
  title: string;
  target: string | null;
  date: ISODate | null;
  time: string | null;
  place: string | null;
  attendees: string | null;
  attendee_count: number;
  estimated_cost: number;
  actual_cost: number;
  status: MeetingStatus;
  memo: string | null;
  event_id: UUID | null;
}

export interface Gift extends BaseRow {
  recipient: string;
  relation: string | null;
  item: string | null;
  estimated_cost: number;
  actual_cost: number;
  is_purchased: boolean;
  is_delivered: boolean;
  delivered_at: ISODate | null;
  memo: string | null;
}

export type EventType =
  | "fitting"
  | "visit"
  | "shoot"
  | "meeting"
  | "payment"
  | "appointment"
  | "travel"
  | "wedding"
  | "other";

export interface CalendarEvent extends BaseRow {
  title: string;
  type: EventType;
  date: ISODate;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  memo: string | null;
  source_type: string | null;
  source_id: UUID | null;
  is_done: boolean;
}

export interface Memo extends BaseRow {
  content: string;
  converted_to: string | null;
}

export interface ActivityLog {
  id: UUID;
  wedding_id: UUID;
  user_id: string | null;
  entity_type: string;
  entity_id: UUID | null;
  action: "create" | "update" | "delete";
  description: string;
  created_at: ISODateTime;
}

export interface Attachment extends BaseRow {
  entity_type: string;
  entity_id: UUID;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size: number;
}

export type ThemeMode = "light" | "dark" | "system";
export type AccentKey = "rose" | "terracotta" | "sage" | "blue" | "gold";
export type FontScale = 0.9 | 1 | 1.1 | 1.2;

export interface UserSettings {
  user_id: string;
  theme: ThemeMode;
  accent: AccentKey;
  font_scale: FontScale;
  updated_at: ISODateTime;
}

export interface TableMap {
  tasks: Task;
  budget_categories: BudgetCategory;
  budget_items: BudgetItem;
  payments: Payment;
  vendors: Vendor;
  venues: Venue;
  honeymoon: Honeymoon;
  honeymoon_items: HoneymoonItem;
  music_items: MusicItem;
  outfit_items: OutfitItem;
  guests: Guest;
  invitation_meetings: InvitationMeeting;
  gifts: Gift;
  events: CalendarEvent;
  memos: Memo;
  activity_logs: ActivityLog;
  attachments: Attachment;
}

export type TableName = keyof TableMap;

export const TABLE_NAMES: TableName[] = [
  "tasks",
  "budget_categories",
  "budget_items",
  "payments",
  "vendors",
  "venues",
  "honeymoon",
  "honeymoon_items",
  "music_items",
  "outfit_items",
  "guests",
  "invitation_meetings",
  "gifts",
  "events",
  "memos",
  "activity_logs",
  "attachments",
];

export type WeddingData = {
  wedding: Wedding;
} & { [K in TableName]: TableMap[K][] };
