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
