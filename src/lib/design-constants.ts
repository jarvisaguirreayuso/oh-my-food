// Pure constants/types shared by server-only code (design.ts) and client code
// (DesignSwitcher) -- kept in their own module so importing them from a Client
// Component never pulls in server-only code like next/headers.
export const DESIGNS = ["actual", "grid", "editorial", "social"] as const;
export type Design = (typeof DESIGNS)[number];

export const DESIGN_COOKIE = "design";
