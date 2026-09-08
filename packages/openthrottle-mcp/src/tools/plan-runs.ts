/**
 * @description Plan-run lifecycle tools: register_plan_run, settle_plan_run,
 * register_plan_run_worktree_checkout, get_plan_runs.
 *
 * These give an INTERACTIVE loop the run row a queued Ralph run has always had, so a run
 * driven from an agent turn stops being invisible to run provenance. They are thin
 * wrappers over mutations that already exist for the detached workflow-ralph CLI; the
 * domain logic that makes them safe — the heartbeat exemption, the cancel floor — lives
 * server-side, not here.
 *
 * There is deliberately NO heartbeat tool. A run registered through the MCP has no timer,
 * declares `heartbeatExpected: false`, and is exempt from every heartbeat-based liveness
 * judgement. The corollary is that NOTHING server-side will ever settle such a row: the
 * caller must settle it on every exit path, including failure.
 */

import { z } from 'zod';
import { hostname as osHostname } from 'os';
import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import type {
  GetPlanRunsQuery,
  RegisterCliPlanRunMutation,
  RegisterPlanRunWorktreeCheckoutMutation,
  SettleCliPlanRunMutation,
} from '../__generated__/graphql.js';
import {
  GetPlanRunsDocument,
  RegisterCliPlanRunDocument,
  RegisterPlanRunWorktreeCheckoutDocument,
  SettleCliPlanRunDocument,
} from '../__generated__/graphql.js';
import type { GenericResult } from '../types/index.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import { resolveExecutionBackend } from '../config/execution-backend.ts';
import {
  forgetPlanRunForBackstop,
  rememberPlanRunForBackstop,
} from '../config/plan-run-backstop.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

// ── register_plan_run ────────────────────────────────────────────────────────

type PlanRun = NonNullable<RegisterCliPlanRunMutation['registerCliPlanRun']>;

type RegisterPlanRunResult = GenericResult<{ run: PlanRun | null }>;

export const registerPlanRunToolParameters = z.object({
  branch: z.string().nullable().optional(),
  executionBackend: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  planId: z.string().uuid(),
});

export const registerPlanRunToolDescription =
  'Open a plan_runs row for the interactive loop you are about to drive, so the run is attributable: which agent, which model, which branch, when it started. Call it once at loop setup and carry the returned run id for the rest of the run. Pass the model you are actually running as — or omit it if you cannot determine one, since null is a legible answer and a plausible-looking guess is not. executionBackend is detected from the launching harness and only used if detection finds nothing; do not declare it otherwise. Best-effort: if this fails, say so and keep working. IMPORTANT: nothing server-side will ever settle this row, so you must call settle_plan_run on every exit path — COMPLETED when the PR opens, CANCELLED on a deliberate stop, FAILED when you give up.';

export async function registerPlanRunToolHandler(
  args: z.infer<typeof registerPlanRunToolParameters>,
): Promise<RegisterPlanRunResult> {
  const parsed = registerPlanRunToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ run: PlanRun | null }>('register_plan_run', async () => {
    // Detection wins over the declared value; see config/execution-backend.ts.
    const executionBackend = resolveExecutionBackend(
      parsed.data.executionBackend,
    );
    if (executionBackend === null) {
      throw new Error(
        'Could not determine the execution backend: nothing was detected from the launching harness and none was declared. Pass executionBackend explicitly.',
      );
    }

    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      RegisterCliPlanRunDocument,
      {
        input: {
          branch: parsed.data.branch ?? null,
          executionBackend,
          // The whole point. An agent turn owns no timer, so this row must be exempt
          // from the stale sweep (which would reset the plan and its IN_PROGRESS tasks
          // to PENDING underneath live work), from isStale, and from the destructive
          // RUN_STOPPING cancel path. This is the difference between telemetry and
          // data loss, so it is hard-coded rather than exposed as an argument.
          heartbeatExpected: false,
          // Defaulted from this process rather than asked of the agent, which does not
          // reliably know either and would guess.
          hostname: osHostname(),
          model: parsed.data.model ?? null,
          pid: process.pid,
          planId: parsed.data.planId,
          workerId: null,
        },
      },
    );

    const run = result?.registerCliPlanRun ?? null;
    if (!run) return null;

    rememberPlanRunForBackstop(parsed.data.planId, run.id);

    // Lead with the id: the agent has to carry it for the rest of the loop, and an id
    // buried in a JSON blob gets lost.
    const text = [
      `Plan run registered. Run id: ${run.id}`,
      `Carry this id and settle it when the loop stops — nothing else will.`,
      ``,
      `backend: ${run.executionBackend}  model: ${run.model ?? '(none declared)'}  branch: ${run.branch ?? '(none)'}`,
      `heartbeatExpected: ${run.heartbeatExpected} (exempt from the stale sweep, so cancellation reaches you only if you poll cancelRequestedAt)`,
    ].join('\n');

    return { structuredContent: { run }, text };
  });
}

// ── settle_plan_run ──────────────────────────────────────────────────────────

type SettledRun = NonNullable<SettleCliPlanRunMutation['settleCliPlanRun']>;

type SettlePlanRunResult = GenericResult<{ run: SettledRun | null }>;

export const settlePlanRunToolParameters = z.object({
  planRunId: z.string().uuid(),
  status: z.string().min(1),
});

export const settlePlanRunToolDescription =
  "Close the plan_runs row opened by register_plan_run. status is COMPLETED (the work shipped), CANCELLED (a deliberate stop) or FAILED (you gave up or crashed out). Call this on EVERY exit path: these rows are exempt from the server's stale sweep, so an unsettled one sits IN_PROGRESS forever, reads as live, and holds its worktree marked busy. Settling an already-settled or unknown run is a safe no-op.";

export async function settlePlanRunToolHandler(
  args: z.infer<typeof settlePlanRunToolParameters>,
): Promise<SettlePlanRunResult> {
  const parsed = settlePlanRunToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ run: SettledRun | null }>('settle_plan_run', async () => {
    const token = getAuthToken();
    // The server validates and uppercases the status; surfacing its error is better than
    // re-validating the same rule in two places that can drift apart.
    const result = await executeGraphqlWithAuth(
      token,
      SettleCliPlanRunDocument,
      {
        input: {
          planRunId: parsed.data.planRunId,
          status: parsed.data.status,
        },
      },
    );

    // Clear the backstop note whatever the server said: if the row is gone or already
    // terminal, there is nothing left for the janitor to do either.
    forgetPlanRunForBackstop();

    const run = result?.settleCliPlanRun ?? null;
    if (!run) {
      // A soft no-op, not an error: the Stop-hook backstop and the loop can both try to
      // settle the same run, and neither should get an error it will retry in a loop.
      return {
        structuredContent: { run: null },
        text: `No plan run ${parsed.data.planRunId} to settle (already settled, or never existed). Nothing to do.`,
      };
    }

    return {
      structuredContent: { run },
      text: `Settled plan run ${run.id} as ${run.status}.`,
    };
  });
}

// ── register_plan_run_worktree_checkout ──────────────────────────────────────

type CheckoutRun = NonNullable<
  RegisterPlanRunWorktreeCheckoutMutation['registerPlanRunWorktreeCheckout']
>;

type RegisterWorktreeCheckoutResult = GenericResult<{
  run: CheckoutRun | null;
}>;

export const registerPlanRunWorktreeCheckoutToolParameters = z.object({
  filesystemPath: z.string().min(1),
  planRunId: z.string().uuid(),
});

export const registerPlanRunWorktreeCheckoutToolDescription =
  'Tell a registered plan run which worktree it is running in, by absolute path, so its checkout_id resolves. That is what makes "open in editor" deep-links work for the run and what lets the worktree read as busy while the loop is live. Call it once, after the worktree exists. Best-effort by design: it quietly returns the run unchanged when the path is not a linked worktree or the repository cannot be resolved.';

export async function registerPlanRunWorktreeCheckoutToolHandler(
  args: z.infer<typeof registerPlanRunWorktreeCheckoutToolParameters>,
): Promise<RegisterWorktreeCheckoutResult> {
  const parsed = registerPlanRunWorktreeCheckoutToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ run: CheckoutRun | null }>(
    'register_plan_run_worktree_checkout',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        RegisterPlanRunWorktreeCheckoutDocument,
        {
          input: {
            filesystemPath: parsed.data.filesystemPath,
            planRunId: parsed.data.planRunId,
          },
        },
      );

      const run = result?.registerPlanRunWorktreeCheckout ?? null;
      if (!run) {
        return {
          structuredContent: { run: null },
          text: `No plan run ${parsed.data.planRunId} found; no checkout was linked.`,
        };
      }

      // Distinguish "linked" from "soft-failed" plainly: both return a run, and a caller
      // that cannot tell them apart will assume a deep-link works when it does not.
      const text =
        run.checkout == null
          ? `Plan run ${run.id} has no checkout linked. The path is not a linked worktree, or its repository could not be resolved — this is a soft failure and the run is otherwise unaffected.`
          : `Plan run ${run.id} is linked to ${run.checkout.kind} checkout "${run.checkout.displayName}" at ${run.checkout.filesystemPath}.`;

      return { structuredContent: { run }, text };
    },
  );
}

// ── get_plan_runs ────────────────────────────────────────────────────────────

type PlanRunRow = GetPlanRunsQuery['planRunsByPlanId'][number];

type GetPlanRunsResult = GenericResult<{ runs: PlanRunRow[] }>;

export const getPlanRunsToolParameters = z.object({
  limit: z.number().int().positive().nullable().optional(),
  planId: z.string().uuid(),
});

export const getPlanRunsToolDescription =
  'List the plan runs recorded for a plan, newest first: status, agent backend, model, branch, run kind, timings, and the worktree it ran in. Use it to attribute an executed plan to the agent and model that ran it, and — during a loop — to poll cancelRequestedAt at task boundaries, which is the ONLY way a Kill reaches an interactive run. Read heartbeatExpected next to isStale: on a run that does not heartbeat, isStale false means "nobody knows", not "verified live".';

export async function getPlanRunsToolHandler(
  args: z.infer<typeof getPlanRunsToolParameters>,
): Promise<GetPlanRunsResult> {
  const parsed = getPlanRunsToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ runs: PlanRunRow[] }>('get_plan_runs', async () => {
    const token = getAuthToken();
    // The server owns the clamp (1..max); duplicating it here would give two places to
    // disagree about the bound.
    const result = await executeGraphqlWithAuth(token, GetPlanRunsDocument, {
      input: { limit: parsed.data.limit ?? null, planId: parsed.data.planId },
    });

    const runs = result?.planRunsByPlanId ?? null;
    if (!runs) return null;

    const cancelled = runs.filter((run) => run.cancelRequestedAt != null);
    const cancelNote =
      cancelled.length === 0
        ? ''
        : `\n\n⚠️ Cancel requested on ${cancelled.map((run) => run.id).join(', ')}. If one of these is your run, stop and settle it CANCELLED.`;

    const text = `${runs.length} plan run(s) on plan ${parsed.data.planId}, newest first.${cancelNote}\n${JSON.stringify(runs, null, 2)}`;

    return { structuredContent: { runs }, text };
  });
}
