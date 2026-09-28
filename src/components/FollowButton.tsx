"use client";

import { useOptimistic, useTransition } from "react";
import { followUser, unfollowUser } from "@/app/social/actions";

export function FollowButton({ userId, following }: { userId: string; following: boolean }) {
  const [optimisticFollowing, setOptimisticFollowing] = useOptimistic(following);
  const [, startTransition] = useTransition();

  function toggle() {
    const willFollow = !optimisticFollowing;
    const formData = new FormData();
    formData.set("userId", userId);
    startTransition(async () => {
      setOptimisticFollowing(willFollow);
      await (willFollow ? followUser(formData) : unfollowUser(formData));
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={
        optimisticFollowing
          ? "rounded-full border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700"
          : "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white"
      }
    >
      {optimisticFollowing ? "Siguiendo" : "Seguir"}
    </button>
  );
}
