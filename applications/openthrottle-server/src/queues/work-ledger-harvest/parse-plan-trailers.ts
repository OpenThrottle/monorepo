/**
 * @description Reads `Plan-Id:` / `Task-Id:` trailers out of a commit message.
 *
 * These trailers are the only durable link between a landed commit and the plan it closed — the
 * commit carries them forever, while the session that produced it is long gone. Harvesting them is
 * what lets the ledger adopt work nobody recorded at the time.
 */

/** A plan (and optionally task) reference read off one commit message. */
export interface PlanTrailerRef {
  /** Raw trailer value: a full uuid, or a short prefix of one. */
  readonly planRef: string;
  /** Raw Task-Id: value paired with this plan, when the commit carried one. */
  readonly taskRef: string | null;
}

/**
 * Trailers are `Key: value` on their own line. Matched case-insensitively and anywhere in the
 * message rather than strictly in a trailer block, because these are written by hand and by several
 * different agents — being strict here would silently drop real links.
 */
const PLAN_ID_PATTERN = /^[ \t]*plan-id:[ \t]*([0-9a-f-]{8,36})[ \t]*$/gim;
const TASK_ID_PATTERN = /^[ \t]*task-id:[ \t]*([0-9a-f-]{8,36})[ \t]*$/gim;

/**
 * @description Extract every plan reference in a commit message, each paired with the task
 * reference from the same message when there is exactly one.
 *
 * A commit legitimately carries more than one `Plan-Id:` — one commit can close work on several
 * plans. When it does, the task pairing is dropped rather than guessed: attaching one commit's
 * single `Task-Id:` to all of its plans would invent links that were never claimed.
 * @public
 */
export function parsePlanTrailers(message: string): readonly PlanTrailerRef[] {
  const planRefs = [...message.matchAll(PLAN_ID_PATTERN)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined);

  if (planRefs.length === 0) return [];

  const taskRefs = [...message.matchAll(TASK_ID_PATTERN)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined);

  const uniquePlanRefs = [...new Set(planRefs)];
  const taskRef =
    uniquePlanRefs.length === 1 && taskRefs.length === 1
      ? (taskRefs[0] ?? null)
      : null;

  return uniquePlanRefs.map((planRef) => ({ planRef, taskRef }));
}

/**
 * @description True when `ref` identifies `id`: either the full uuid, or a prefix of it.
 *
 * Prefix matching is required, not a convenience — some trailers in history are 8-character short
 * ids rather than full uuids, and equality alone would drop them as unresolvable.
 *
 * A prefix is only accepted when it is at least 8 characters, so a stray short value cannot sweep
 * up an unrelated plan.
 * @public
 */
export function planRefMatches(ref: string, id: string): boolean {
  const normalizedRef = ref.toLowerCase();
  const normalizedId = id.toLowerCase();

  if (normalizedRef === normalizedId) return true;

  return normalizedRef.length >= 8 && normalizedId.startsWith(normalizedRef);
}
