/**
 * Plan-first session kickoff — the tool-neutral decision.
 *
 * Follow-up work runs from an OpenThrottle plan, so a session an agent spawns
 * or hands off must carry a brief whose first non-empty line is
 * `/ot-loop <planUuid>`. This module decides a brief; each tool's adapter
 * decides which of its tool calls are kickoffs, where the brief sits in its
 * payload, and how a deny is rendered back to its harness.
 *
 * Fail-open throughout: anything short of a clean "OT has no such plan or task"
 * allows. A guard that blocks kickoffs because OT is down is worse than one
 * plan-less session.
 *
 * @public
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import { logHookError } from '../utils/logging.ts';

const OT_LOOP_LINE =
  /^\/ot-loop\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i;

const LOOKUP_QUERY = `
query KickoffGuardLookup($id: ID!) {
  plan(id: $id) { id }
  task(id: $id) { id }
}
`;

const REMEDIATION =
  'Create the plan first (create_plan + create_tasks, status PENDING, tagged follow-up), ' +
  'then re-issue this call with a brief whose first line is `/ot-loop <planId>`. ' +
  'See skills/ot-plans/SKILL.md § Follow-ups and session kickoff.';

/**
 * Whether the uuid in a brief names a real plan or task.
 *
 * @public
 */
export type OtIdLookup = 'found' | 'missing' | 'unknown';

/** @public */
export type KickoffDecision =
  | { readonly decision: 'allow' }
  | { readonly decision: 'deny'; readonly reason: string };

/** @public */
export const KICKOFF_ALLOW: KickoffDecision = { decision: 'allow' };

/**
 * The plan uuid from a brief's first non-empty line, or null when it is not
 * `/ot-loop <uuid>`.
 *
 * @public
 */
export const parseKickoffPlanId = (brief: string): string | null => {
  const firstLine = brief.split('\n').find((line) => line.trim() !== '');
  const match = firstLine?.trim().match(OT_LOOP_LINE);
  return match?.[1] ?? null;
};

/**
 * Ask OT whether `id` is a plan or task. Anything short of a clean answer —
 * no endpoint, a network failure, a timeout, an error with no data — is
 * `unknown`, so the caller can fail open.
 *
 * @public
 */
export const lookupOtId = async ({
  authToken,
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  id,
  timeoutMs,
}: {
  readonly authToken: string;
  readonly fetchImpl?: typeof globalThis.fetch;
  readonly graphqlUrl: string | null;
  readonly id: string;
  readonly timeoutMs: number;
}): Promise<OtIdLookup> => {
  if (!graphqlUrl || typeof fetchImpl !== 'function') return 'unknown';

  try {
    const response = await fetchImpl(graphqlUrl, {
      body: JSON.stringify({ query: LOOKUP_QUERY, variables: { id } }),
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return 'unknown';

    const payload: unknown = await response.json();
    if (!isRecord(payload) || !isRecord(payload.data)) return 'unknown';
    const { plan, task } = payload.data;
    if (isRecord(plan) || isRecord(task)) return 'found';
    // A not-found that arrived alongside errors may be an auth failure, not absence.
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      return 'unknown';
    }

    return 'missing';
  } catch (err) {
    logHookError('kickoff-guard: OT lookup failed', err);
    return 'unknown';
  }
};

/**
 * Decide a kickoff brief: allow no brief, or an `/ot-loop <uuid>` brief whose
 * uuid OT does not reject; deny a prose brief or an unknown uuid.
 *
 * @public
 */
export const decideKickoffBrief = async (
  brief: string | null,
  lookup: (id: string) => Promise<OtIdLookup>,
): Promise<KickoffDecision> => {
  if (brief === null || brief.trim() === '') return KICKOFF_ALLOW;

  const planId = parseKickoffPlanId(brief);
  if (planId === null) {
    return {
      decision: 'deny',
      reason: `Session kickoffs in this repo run from an OpenThrottle plan, and this brief does not start with \`/ot-loop <planUuid>\`. ${REMEDIATION}`,
    };
  }

  if ((await lookup(planId)) === 'missing') {
    return {
      decision: 'deny',
      reason: `\`/ot-loop ${planId}\` names no OpenThrottle plan or task. ${REMEDIATION}`,
    };
  }

  return KICKOFF_ALLOW;
};
