"use client";

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
            className={`h-8 w-8 rounded-full text-sm font-medium ${
              n <= value ? "bg-accent text-white" : "bg-stone-100 text-stone-500"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
