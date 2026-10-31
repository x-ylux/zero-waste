"use client";

export function QrPanel({ value }: { value: string }) {
  const modules = value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const cells = Array.from({ length: 21 * 21 }, (_, index) => {
    const x = index % 21;
    const y = Math.floor(index / 21);
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    if (!finder) {
      return (x + y + modules) % 3 === 0;
    }
    const onBorder = x === 0 || y === 0 || x === 6 || y === 6 || x === 20 || y === 20;
    const onInner = x > 1 && x < 5 && y > 1 && y < 5;
    return onBorder || onInner;
  });

  return (
    <div className="space-y-2">
      <div
        role="img"
        aria-label={`QR-style code linking to ${value}. Decorative prototype code, not a food-safety mark.`}
        className="grid w-48 grid-cols-[repeat(21,minmax(0,1fr))] gap-px rounded-xl bg-white p-3 shadow-inner"
      >
        {cells.map((on, index) => (
          <span key={index} className={on ? "aspect-square bg-warmgray-900" : "aspect-square bg-white"} />
        ))}
      </div>
      <p className="break-all text-xs text-warmgray-500">{value}</p>
    </div>
  );
}
