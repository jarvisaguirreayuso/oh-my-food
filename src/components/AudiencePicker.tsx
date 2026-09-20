"use client";

import { useState } from "react";
import { AUDIENCE_OPTIONS } from "@/lib/audience";
import type { Audience } from "@/lib/validation";

export type AudienceValue = { audience: Audience };

// Who can see a visit (with the author's name). Every non-private visit
// always counts towards the place's general average automatically. Works
// both controlled-by-callback (visit forms send a JSON payload) and as
// plain form fields (profile settings), via `audienceName`.
export function AudiencePicker({
  initial,
  onChange,
  audienceName,
}: {
  initial: AudienceValue;
  onChange?: (v: AudienceValue) => void;
  audienceName?: string;
}) {
  const [audience, setAudience] = useState<Audience>(initial.audience);

  function update(nextAudience: Audience) {
    setAudience(nextAudience);
    onChange?.({ audience: nextAudience });
  }

  return (
    <div className="flex flex-col gap-1.5">
      {AUDIENCE_OPTIONS.map((o) => (
        <label
          key={o.value}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 ${
            audience === o.value ? "border-accent bg-stone-50" : "border-stone-200"
          }`}
        >
          <input
            type="radio"
            name={audienceName}
            value={o.value}
            checked={audience === o.value}
            onChange={() => update(o.value)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium">{o.label}</span>
            <span className="block text-xs text-stone-500">{o.hint}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
