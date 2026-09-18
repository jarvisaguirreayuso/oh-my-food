"use client";

export function StarInput({
  value,
  onChange,
  name,
  optional = false,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  name?: string;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrellas`}
          onClick={() => onChange(value === n && optional ? null : n)}
          className="p-1 text-2xl leading-none"
        >
          <span className={value !== null && n <= value ? "text-amber-500" : "text-neutral-300"}>
            ★
          </span>
        </button>
      ))}
      {optional && value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 text-xs text-neutral-400 underline"
        >
          quitar
        </button>
      )}
    </div>
  );
}
