"use client";

function Belly({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <ellipse
        cx="12"
        cy="13"
        rx="9"
        ry="8"
        className={active ? "fill-accent" : "fill-stone-200"}
      />
      <circle cx="12" cy="14" r="1.4" className={active ? "fill-white/80" : "fill-stone-400"} />
    </svg>
  );
}

export function RatingSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-stone-600">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n}`}
            className="rounded-full p-0.5"
          >
            <Belly active={n <= value} />
          </button>
        ))}
      </div>
    </div>
  );
}
