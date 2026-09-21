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

// Two small squares instead of a stack of differently-labeled numbers: general
// on the left, friends on the right. Tapping the friends square expands the
// individual notes it's made of, same as before, just less real estate up front.
export function PlaceStatSquares({
  general,
  friends,
  signedIn,
}: {
  general: { avg: number | null; n: number } | null;
  friends: { avg: number; n: number; visits: FriendVisit[] } | null;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex aspect-square flex-col items-center justify-center rounded-xl border border-stone-200 p-3 text-center">
          <div className="text-3xl font-bold">{general?.avg != null ? general.avg.toFixed(1) : "—"}</div>
          <div className="mt-1 text-xs text-stone-500">General{general ? ` · ${general.n}` : ""}</div>
        </div>

        {!signedIn ? (
          <Link
            href="/auth/login"
            className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 p-3 text-center"
          >
            <div className="text-xs font-medium text-accent">Entra</div>
            <div className="mt-1 text-xs text-stone-500">para ver amigos</div>
          </Link>
        ) : friends ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex aspect-square flex-col items-center justify-center rounded-xl border border-stone-200 p-3 text-center"
          >
            <div className="text-3xl font-bold">{friends.avg.toFixed(1)}</div>
            <div className="mt-1 text-xs text-stone-500">Amigos · {friends.n}</div>
          </button>
        ) : (
          <div className="flex aspect-square flex-col items-center justify-center rounded-xl border border-stone-200 p-3 text-center">
            <div className="text-3xl font-bold text-stone-300">—</div>
            <div className="mt-1 text-xs text-stone-500">Amigos</div>
          </div>
        )}
      </div>

      {open && friends && (
        <ul className="mt-3 flex flex-col gap-3 rounded-xl border border-stone-200 p-4">
          {friends.visits.map((v) => (
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
