"use client";

import Link from "next/link";
import { useState } from "react";

type FriendVisit = {
  id: string;
  visited_on: string;
  place_rating: number | null;
  place_comment: string | null;
  profiles: { username: string; display_name: string | null } | null;
};

// Click-to-expand so the average number ("4.0 · gente que sigues") isn't just
// an opaque stat -- you can see exactly whose notes it's made of.
export function FriendsRatings({ avg, visits }: { avg: number; visits: FriendVisit[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 rounded-xl border border-stone-200 p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <div className="text-lg font-medium">{avg.toFixed(1)} · gente que sigues</div>
          <div className="text-xs text-stone-500">
            {visits.length} {visits.length === 1 ? "nota" : "notas"} de quien sigues y comparte su reseña contigo
          </div>
        </div>
        <span className="shrink-0 text-xs font-normal text-accent">{open ? "Ocultar" : "Ver notas"}</span>
      </button>
      {open && (
        <ul className="mt-3 flex flex-col gap-3 border-t border-stone-100 pt-3">
          {visits.map((v) => (
            <li key={v.id} className="text-sm">
              <div className="flex items-center justify-between text-xs text-stone-500">
                {v.profiles ? (
                  <Link href={`/u/${v.profiles.username}`} className="font-medium text-stone-800">
                    {v.profiles.display_name || `@${v.profiles.username}`}
                  </Link>
                ) : (
                  <span>Usuario</span>
                )}
                <span>{v.visited_on}</span>
              </div>
              <div className="mt-0.5 font-medium">{"★".repeat(v.place_rating ?? 0)}</div>
              {v.place_comment && <p className="mt-0.5 text-stone-600">{v.place_comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
