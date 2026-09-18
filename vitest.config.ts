import { defineConfig } from "vitest/config";

// These tests hit the LOCAL Supabase stack only (started via `supabase start`,
// seeded via `supabase db reset`). They must never be pointed at a remote/
// production project: see tests/README.md.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
