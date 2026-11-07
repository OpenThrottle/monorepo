// Seeded local account from scripts/bootstrap-default-user.ts. The same env
// overrides that script reads win, so a customised bootstrap still works.
export const E2E_USER = {
  email:
    process.env.OPENTHROTTLE_BOOTSTRAP_USER_EMAIL?.trim() ||
    'developer@openthrottle.ai',
  password:
    process.env.OPENTHROTTLE_BOOTSTRAP_USER_PASSWORD?.trim() ||
    'FullThrottle2026!',
} as const;

export const E2E_SERVER_URL: string =
  process.env.OPENTHROTTLE_SERVER_URL?.trim() || 'http://localhost:6021';

export const PROBE_TIMEOUT_MS = 3_000;
