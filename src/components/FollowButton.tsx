import { followUser, unfollowUser } from "@/app/social/actions";

export function FollowButton({ userId, following }: { userId: string; following: boolean }) {
  return (
    <form action={following ? unfollowUser : followUser}>
      <input type="hidden" name="userId" value={userId} />
      <button
        className={
          following
            ? "rounded-full border border-neutral-300 px-4 py-1.5 text-sm font-medium text-neutral-700"
            : "rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white"
        }
      >
        {following ? "Siguiendo" : "Seguir"}
      </button>
    </form>
  );
}
