// A rating with its sample size: "★ 4.2 (12)". Used wherever a score is shown next to a place.
export function Stars({ value, n }: { value: number; n?: number }) {
  return (
    <span className="whitespace-nowrap font-semibold text-accent">
      ★ {value.toFixed(1)}
      {n != null && <span className="ml-1 text-xs font-normal text-stone-400">({n})</span>}
    </span>
  );
}
