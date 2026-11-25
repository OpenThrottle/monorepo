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

export type ProcessRolesKey = keyof typeof PROCESS_ROLES;
export type ProcessRolesValue = (typeof PROCESS_ROLES)[ProcessRolesKey];

/**
 * @description The oldest Node major the server boots on: the lowest major the
 * root `package.json` `engines.node` allows (a test keeps the two equal). The
 * production images pin it; running from source uses the shell's Node, which
 * only `pnpm install` checks otherwise.
 */
export const MINIMUM_NODE_MAJOR = 26;
