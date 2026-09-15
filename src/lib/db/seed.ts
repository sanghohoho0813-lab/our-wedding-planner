import { nowISO, uid } from "@/lib/utils";
import type { BudgetCategory, Task, WeddingData } from "./types";

export const DEFAULT_CATEGORIES: { name: string; icon: string }[] = [
  { name: "웨딩홀", icon: "building-2" },
  { name: "스드메", icon: "camera" },
  { name: "신혼여행", icon: "plane" },
  { name: "예복", icon: "shirt" },
  { name: "헤어 & 메이크업", icon: "sparkles" },
  { name: "부케", icon: "flower-2" },
  { name: "청첩장", icon: "mail" },
  { name: "선물", icon: "gift" },
  { name: "예물", icon: "gem" },
  { name: "혼수", icon: "sofa" },
  { name: "기타", icon: "more-horizontal" },
];

export const STARTER_TASKS: { title: string; category: string; offsetDays: number; priority?: Task["priority"] }[] = [
  { title: "예식장 투어 및 계약", category: "식장", offsetDays: -300, priority: "high" },
  { title: "스드메 업체 비교 및 예약", category: "스드메", offsetDays: -240, priority: "high" },
  { title: "상견례 일정 잡기", category: "상견례", offsetDays: -220 },
  { title: "신혼여행지 정하기", category: "신혼여행", offsetDays: -200 },
  { title: "예복 / 드레스 투어", category: "예복", offsetDays: -150 },
  { title: "신혼여행 항공권 예약", category: "신혼여행", offsetDays: -120, priority: "high" },
  { title: "청첩장 디자인 고르기", category: "청첩장", offsetDays: -90 },
  { title: "하객 명단 정리", category: "하객", offsetDays: -75 },
  { title: "청첩장 주문", category: "청첩장", offsetDays: -60, priority: "high" },
  { title: "청첩장 모임 일정 잡기", category: "청첩장", offsetDays: -50 },
  { title: "부케 업체 확정", category: "부케", offsetDays: -45 },
  { title: "축가 / 사회자 섭외", category: "기타", offsetDays: -40 },
  { title: "예복 최종 피팅", category: "예복", offsetDays: -21 },
  { title: "식순 최종 점검", category: "기타", offsetDays: -14, priority: "high" },
  { title: "혼주 / 양가 부모님 선물 준비", category: "선물", offsetDays: -14 },
  { title: "신혼여행 짐 싸기", category: "신혼여행", offsetDays: -3 },
];

export function seedWeddingData(data: WeddingData, weddingDate: string) {
  const ts = nowISO();
  data.budget_categories = DEFAULT_CATEGORIES.map<BudgetCategory>((c, i) => ({
    id: uid(),
    wedding_id: data.wedding.id,
    name: c.name,
    icon: c.icon,
    sort_order: i,
    planned_amount: 0,
    created_at: ts,
    updated_at: ts,
  }));
  const base = new Date(weddingDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  data.tasks = STARTER_TASKS.map<Task>((t, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + t.offsetDays);
    // 이미 지난 시점의 기본 할 일은 날짜 미정으로 두어 사용자가 직접 정하게 한다
    const due = d < today ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      id: uid(),
      wedding_id: data.wedding.id,
      title: t.title,
      category: t.category,
      due_date: due,
      status: "todo",
      priority: t.priority ?? "normal",
      assignee: "both",
      memo: null,
      vendor_id: null,
      budget_item_id: null,
      is_favorite: false,
      completed_at: null,
      sort_order: i,
      created_at: ts,
      updated_at: ts,
    };
  });
  return data;
}
