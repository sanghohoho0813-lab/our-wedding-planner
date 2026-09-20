import type { Guest } from "@/lib/db/types";

export interface GuestStats {
  total: number;
  groom: number;
  bride: number;
  /** 신랑 · 신부 둘 다 아는 지인. 양쪽에 겹쳐 세지 않고 따로 센다. */
  both: number;
  confirmed: number;
  confirmedPeople: number;
  maybe: number;
  declined: number;
  expectedPeople: number;
  invited: number;
  contacted: number;
  meals: number;
}

export function computeGuestStats(guests: Guest[]): GuestStats {
  const s: GuestStats = {
    total: guests.length,
    groom: 0,
    bride: 0,
    both: 0,
    confirmed: 0,
    confirmedPeople: 0,
    maybe: 0,
    declined: 0,
    expectedPeople: 0,
    invited: 0,
    contacted: 0,
    meals: 0,
  };
  for (const g of guests) {
    if (g.side === "groom") s.groom++;
    else if (g.side === "bride") s.bride++;
    else s.both++;
    const people = 1 + (g.companions ?? 0);
    if (g.rsvp === "yes") {
      s.confirmed++;
      s.confirmedPeople += people;
      s.expectedPeople += people;
      if (g.meal !== "no") s.meals += people;
    } else if (g.rsvp === "maybe") {
      s.maybe++;
      s.expectedPeople += people;
    } else s.declined++;
    if (g.invitation_sent) s.invited++;
    if (g.contacted) s.contacted++;
  }
  return s;
}
