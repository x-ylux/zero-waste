"use client";

import { hoursUntil } from "@/lib/format";
import { useEffect, useState } from "react";

export function PickupCountdown({ deadline }: { deadline: string }) {
  const [hours, setHours] = useState(() => hoursUntil(deadline));

  useEffect(() => {
    const timer = window.setInterval(() => setHours(hoursUntil(deadline)), 30000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const overdue = hours < 0;
  const label = overdue
    ? `Window ended ${Math.abs(hours).toFixed(1)} hours ago`
    : `${hours.toFixed(1)} hours remaining in the stated pickup window`;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <p className="font-medium">{label}</p>
      <p className="text-xs">
        This countdown is an operational reminder only. It is not proof that the food is safe to eat.
      </p>
    </div>
  );
}
