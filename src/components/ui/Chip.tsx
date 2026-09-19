import Link from "next/link";

// Filter / tab pill. Active = accent, inactive = quiet. One place for the look.
export function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
        active ? "bg-accent text-white" : "bg-stone-100 text-stone-700"
      }`}
    >
      {children}
    </Link>
  );
}
