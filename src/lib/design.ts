import { cookies } from "next/headers";
import { DESIGNS, DESIGN_COOKIE, type Design } from "@/lib/design-constants";

// Temporary comparison tool: 4 visual/component skins for the SAME routes and
// data. "actual" mirrors today's look; the other 3 are candidates. Once one is
// picked, this file, the switcher, and the 3 losing `designs/<skin>` folders
// all get deleted together. Server-only (reads cookies) -- the mutator lives
// in design-actions.ts and the shared constants in design-constants.ts, so
// this file's next/headers import never leaks into a Client Component bundle.
export async function getDesign(): Promise<Design> {
  const store = await cookies();
  const value = store.get(DESIGN_COOKIE)?.value;
  return (DESIGNS as readonly string[]).includes(value ?? "") ? (value as Design) : "actual";
}
