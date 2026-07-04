/**
 * @description PROCESS_ROLE decides which halves of the server a process
 * hosts. Process isolation only — job crash safety stays with BullMQ
 * stalled-recovery; the point is that editing API code no longer restarts the
 * worker (or detaches its debugger), and one image can run as split API/worker
 * dynos in prod.
 *
 * - `api`: HTTP + GraphQL + queue producers; no BullMQ WorkerHost processors.
 * - `worker`: queue processors (plus the producers they depend on); no HTTP
 *   listener, no GraphQL.
 * - `all` (default): today's single-process behavior — everything in one
 *   process.
 */
export const PROCESS_ROLES = {
  all: 'all',
  api: 'api',
  worker: 'worker',
} as const;

export type ProcessRoleKey = keyof typeof PROCESS_ROLES;
export type ProcessRole = (typeof PROCESS_ROLES)[keyof typeof PROCESS_ROLES];

const isProcessRole = (value: string): value is ProcessRole =>
  value in PROCESS_ROLES;

/**
 * @description Resolves PROCESS_ROLE from the environment. Unset/blank
 * defaults to `all`; anything else invalid fails fast at bootstrap rather than
 * silently running with the wrong module graph.
 */
export const resolveProcessRole = (): ProcessRole => {
  const raw = process.env.PROCESS_ROLE?.trim().toLowerCase();

  if (!raw) {
    return PROCESS_ROLES.all;
  }

  if (!isProcessRole(raw)) {
    throw new Error(
      `Invalid PROCESS_ROLE "${raw}". Expected one of: ${Object.keys(
        PROCESS_ROLES,
      ).join(', ')}.`,
    );
  }

  return raw;
};
