import type { Venue } from "@/lib/db/types";
import type { GuestStats } from "./guests";

/**
 * 예상 식대.
 *
 * 한국 예식장은 '보증 인원' 이 있어서, 실제로 몇 명이 오든
 * **보증 인원만큼은 무조건 낸다.** 그래서 실제 청구 인원은
 *
 *     max(보증 인원, 오는 사람 수)
 *
 * 이고, 보증에 못 미치면 빈자리 값을 내는 셈이 된다.
 * 이 계산은 결혼 예산에서 가장 큰 덩어리인데 손으로 하면 늘 틀린다.
 *
 * 인원은 **하객 명단에서 센 수**를 쓴다. 식장 화면에 따로 적어 둔
 * '예상 인원' 은 명단이 비었을 때만 쓴다 — 같은 숫자를 두 군데서
 * 관리하면 반드시 어긋나기 때문이다(그래서 여기 한 곳에서만 센다).
 */
export interface MealEstimate {
  /** 계약한 식장 (없으면 null) */
  venue: Venue | null;
  /** 1인 식대가 입력되어 있는지. 없으면 금액 계산은 의미가 없다. */
  hasCost: boolean;
  perPerson: number;
  hallFee: number;

  /** 보증 인원 (0이면 보증 없음) */
  guaranteed: number;
  /** 참석 확정 인원 (본인 + 동반) */
  confirmed: number;
  /** 불참을 뺀 인원 (참석 + 미정) */
  expected: number;
  /** 인원을 하객 명단에서 셌는지 (false 면 식장에 적어 둔 예상 인원을 쓴 것) */
  fromGuestList: boolean;

  /** 실제로 돈을 내게 되는 인원 = max(보증, 예상) */
  billable: number;
  /** 예상 기준 식대 */
  cost: number;
  /** 참석 확정만으로 계산한 식대 (아직 덜 확정됐을 때의 하한) */
  confirmedCost: number;
  /** 대관료 + 예상 식대 */
  total: number;

  /** 보증 인원에 몇 명 모자라는지 (양수면 빈자리 값을 낸다) */
  shortfall: number;
  /** 보증 인원을 몇 명 넘는지 */
  over: number;
}

export function computeMealEstimate(venues: Venue[], stats: GuestStats): MealEstimate {
  const venue = venues.find((v) => v.is_contracted) ?? null;
  const perPerson = venue?.meal_cost ?? 0;
  const hallFee = venue?.hall_fee ?? 0;
  const guaranteed = venue?.guaranteed_guests ?? 0;

  // 명단이 한 명이라도 있으면 명단이 정답이다.
  const fromGuestList = stats.total > 0;
  const expected = fromGuestList ? stats.expectedPeople : (venue?.expected_guests ?? 0);
  const confirmed = fromGuestList ? stats.confirmedPeople : 0;

  const billable = Math.max(guaranteed, expected);
  const billableConfirmed = Math.max(guaranteed, confirmed);

  return {
    venue,
    hasCost: perPerson > 0,
    perPerson,
    hallFee,
    guaranteed,
    confirmed,
    expected,
    fromGuestList,
    billable,
    cost: perPerson * billable,
    confirmedCost: perPerson * billableConfirmed,
    total: hallFee + perPerson * billable,
    shortfall: Math.max(0, guaranteed - expected),
    over: Math.max(0, expected - guaranteed),
  };
}
