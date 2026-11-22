/**
 * @description Running a project: run_project and cancel_project_run. Mirrors the runProject /
 * cancelProjectRun mutations via GraphQL only. A project run is strictly sequential: it enqueues
 * the project's plans one at a time in project order (each with its own runner), and a plan is done
 * when its run settles COMPLETED with a draft PR. The first plan that does not finish stops the run;
 * calling run_project again resumes there. Poll a run through get_project's latestProjectRun.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import type { z } from 'zod';

import type {
  McpProjectRunFragment,
  McpProjectRunPlanFragment,
} from '../__generated__/graphql.js';
import {
  McpCancelProjectRunDocument,
  McpRunProjectDocument,
} from '../__generated__/graphql.js';
import {
  CancelProjectRunInputSchema,
  RunProjectInputSchema,
} from '../__generated__/schemas.ts';
import { getAuthToken } from '../auth/getAuthToken.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/runTool.ts';

interface ProjectRunPlanRef {
  readonly id: string;
  readonly title: string;
}

/**
 * @description A project run as tools return it: plan references flattened to id + title and the
 * nullable scalars explicit.
 */
export interface ProjectRunSummary {
  readonly cancelRequestedAt: string | null;
  readonly createdAt: string;
  readonly currentPlan: ProjectRunPlanRef | null;
  readonly id: string;
  readonly projectId: string;
  readonly settledAt: string | null;
  readonly startedAt: string | null;
  readonly status: string;
  readonly stoppedByPlan: ProjectRunPlanRef | null;
  readonly stoppedReason: string | null;
}

const toPlanRef = (
  plan: McpProjectRunPlanFragment | null | undefined,
): ProjectRunPlanRef | null => {
  if (plan == null) {
    return null;
  }

  return { id: plan.id, title: plan.title };
};

const toOptionalString = (value: unknown): string | null => {
  return value == null ? null : String(value);
};

/**
 * @description Maps the GraphQL projection of a project run to {@link ProjectRunSummary}.
 */
export const toProjectRunSummary = (
  run: McpProjectRunFragment,
): ProjectRunSummary => {
  return {
    cancelRequestedAt: toOptionalString(run.cancelRequestedAt),
    createdAt: String(run.createdAt),
    currentPlan: toPlanRef(run.currentPlan),
    id: run.id,
    projectId: run.projectId,
    settledAt: toOptionalString(run.settledAt),
    startedAt: toOptionalString(run.startedAt),
    status: run.status,
    stoppedByPlan: toPlanRef(run.stoppedByPlan),
    stoppedReason: run.stoppedReason ?? null,
  };
};

/**
 * @description One line naming where a run stands, for a tool's text result.
 */
const describeProjectRun = (run: ProjectRunSummary): string => {
  if (run.status === 'STOPPED') {
    const stopper = run.stoppedByPlan?.title ?? 'unknown';
    const reason = run.stoppedReason ?? 'no reason recorded';

    return `Project run ${run.id} STOPPED at plan ${stopper}: ${reason}. Call run_project again to resume there.`;
  }

  if (run.currentPlan === null) {
    return `Project run ${run.id} is ${run.status}.`;
  }

  return `Project run ${run.id} is ${run.status}, on plan ${run.currentPlan.title}.`;
};

// ── run_project ──────────────────────────────────────────────────────────────

export const runProjectToolParameters = RunProjectInputSchema().strict();

export const runProjectToolDescription = `Run a project's plans strictly one at a time in project order, one draft PR each. A plan is done when its run settles COMPLETED with a PR; the first that is not stops the run (STOPPED, stoppedReason). Call again to resume. Poll with get_project.`;

export async function runProjectToolHandler(
  args: z.infer<typeof runProjectToolParameters>,
): Promise<GenericResult<{ projectRun: ProjectRunSummary }>> {
  const parsed = runProjectToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ projectRun: ProjectRunSummary }>('run_project', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(token, McpRunProjectDocument, {
      input: parsed.data,
    });
    const run = result?.runProject;
    if (!run) {
      return null;
    }

    const projectRun = toProjectRunSummary(run);
    return {
      structuredContent: { projectRun },
      text: describeProjectRun(projectRun),
    };
  });
}

// ── cancel_project_run ───────────────────────────────────────────────────────

export const cancelProjectRunToolParameters =
  CancelProjectRunInputSchema().strict();

export const cancelProjectRunToolDescription = `Cancel a project run and the plan run it is waiting on.`;

export async function cancelProjectRunToolHandler(
  args: z.infer<typeof cancelProjectRunToolParameters>,
): Promise<GenericResult<{ projectRun: ProjectRunSummary }>> {
  const parsed = cancelProjectRunToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ projectRun: ProjectRunSummary }>(
    'cancel_project_run',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        McpCancelProjectRunDocument,
        { input: parsed.data },
      );
      const run = result?.cancelProjectRun;
      if (!run) {
        return null;
      }

      const projectRun = toProjectRunSummary(run);
      return {
        structuredContent: { projectRun },
        text: describeProjectRun(projectRun),
      };
    },
  );
}
