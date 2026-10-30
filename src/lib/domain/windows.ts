function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function timeOfDayMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function hoursOverlap(
  pickupStartIso: string,
  pickupEndIso: string,
  receivingStart: string,
  receivingEnd: string
): boolean {
  const pickupStart = timeOfDayMinutes(pickupStartIso);
  const pickupEnd = timeOfDayMinutes(pickupEndIso);
  const recvStart = parseMinutes(receivingStart);
  const recvEnd = parseMinutes(receivingEnd);

  const pickupRangeEnd = pickupEnd >= pickupStart ? pickupEnd : pickupEnd + 24 * 60;
  const recvRangeEnd = recvEnd >= recvStart ? recvEnd : recvEnd + 24 * 60;

  const a1 = pickupStart;
  const a2 = pickupRangeEnd;
  const b1 = recvStart;
  const b2 = recvRangeEnd;

  return a1 < b2 && b1 < a2;
}

export function hoursSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  return (now.getTime() - new Date(iso).getTime()) / (1000 * 60 * 60);
}
