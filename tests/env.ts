// Local-only test config. See tests/README.md — never point this at a
// remote/production Supabase project.
export const SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? "http://127.0.0.1:54321";

// The standard `supabase start` local demo anon key — identical on every
// machine, not a secret. Override via TEST_SUPABASE_ANON_KEY if needed.
export const SUPABASE_ANON_KEY =
  process.env.TEST_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const SEED_USERS = {
  ana: {
    id: "11111111-1111-1111-1111-111111111111",
    email: "ana@example.com",
    password: "password123",
  },
  bruno: {
    id: "22222222-2222-2222-2222-222222222222",
    email: "bruno@example.com",
    password: "password123",
  },
  carla: {
    id: "33333333-3333-3333-3333-333333333333",
    email: "carla@example.com",
    password: "password123",
  },
  david: {
    id: "44444444-4444-4444-4444-444444444444",
    email: "david@example.com",
    password: "password123",
  },
} as const;

export const SEED_PLACES = {
  improving: "aaaaaaaa-0001-0001-0001-000000000001", // Casa Manolo
  declining: "aaaaaaaa-0002-0002-0002-000000000002", // Bocatería El Rápido
  stable: "aaaaaaaa-0003-0003-0003-000000000003", // Taco Volador
  filler: "aaaaaaaa-0004-0004-0004-000000000004", // Mercado de la Paella
} as const;
