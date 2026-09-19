"use client";

import { useState } from "react";
import { AUDIENCE_OPTIONS, POOLS_LABEL } from "@/lib/audience";
import type { Audience } from "@/lib/validation";

export type AudienceValue = { audience: Audience; poolsPublicly: boolean };

// Who can see a visit (with the author's name) and whether it also counts in the
// place's general average. Works both controlled-by-callback (visit forms send a
// JSON payload) and as plain form fields (profile settings), via `audienceName`
// / `poolsName`.
export function AudiencePicker({
  initial,
  onChange,
  audienceName,
  poolsName,
}: {
  initial: AudienceValue;
  onChange?: (v: AudienceValue) => void;
  audienceName?: string;
  poolsName?: string;
}) {
  const [audience, setAudience] = useState<Audience>(initial.audience);
  const [pools, setPools] = useState(initial.audience === "private" ? false : initial.poolsPublicly);

  function update(nextAudience: Audience, nextPools: boolean) {
    // A private visit never counts towards the general average.
    const effectivePools = nextAudience === "private" ? false : nextPools;
    setAudience(nextAudience);
    setPools(effectivePools);
    onChange?.({ audience: nextAudience, poolsPublicly: effectivePools });
  }

  return (
    <div className="flex flex-col gap-2">
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
              onChange={() => update(o.value, pools)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="block text-xs text-stone-500">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <label
        className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm ${
          audience === "private" ? "text-stone-400" : ""
        }`}
      >
        <input
          type="checkbox"
          name={poolsName}
          checked={pools}
          disabled={audience === "private"}
          onChange={(e) => update(audience, e.target.checked)}
          className="mt-1"
        />
        <span>{POOLS_LABEL}</span>
      </label>
    </div>
  );
}
