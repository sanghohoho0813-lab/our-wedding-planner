import { Camera, CircleDot, CreditCard, Gem, MapPin, Plane, Shirt, Users, CalendarCheck } from "lucide-react";
import type { EventType } from "@/lib/db/types";

export function EventTypeIcon({ type, className }: { type: EventType; className?: string }) {
  switch (type) {
    case "fitting":
      return <Shirt className={className} />;
    case "visit":
      return <MapPin className={className} />;
    case "shoot":
      return <Camera className={className} />;
    case "meeting":
      return <Users className={className} />;
    case "payment":
      return <CreditCard className={className} />;
    case "appointment":
      return <CalendarCheck className={className} />;
    case "travel":
      return <Plane className={className} />;
    case "wedding":
      return <Gem className={className} />;
    default:
      return <CircleDot className={className} />;
  }
}
