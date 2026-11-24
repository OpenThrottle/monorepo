/**
 * @description Validates the plan run-options UI state the way the plan route does: the
 * plan / task target UUIDs, the optional agent timeout text, the driver id, the
 * Cursor-only worktree base, and the enqueue tuning shape (the generated tuning schema).
 */

import { PlanRunTuningInputSchema } from '~/__generated__/schemas';

import { buildPlanRunTuningInput } from './buildPlanRunTuningInput';
import type { PlanRunOptions } from './plan-run-options';
import {
  isUuid,
  parsePlanRunTimeoutSeconds,
  PLAN_RUN_KNOWN_DRIVERS,
} from './plan-run-options';

/**
 * @description One validation issue.
 */
export interface PlanRunValidationIssue {
  readonly code: string;
  readonly message: string;
}

/**
 * @description Options for {@link validatePlanRunOptionsState}. When `requireTargetIds` is
 * false, plan / task id presence rules are skipped (e.g. Configuration panel without a
 * route-seeded id).
 */
interface ValidatePlanRunOptionsStateOptions {
  readonly requireTargetIds?: boolean;
}

const PLAN_UUID_MESSAGE = `Plan must be a OpenThrottle plan UUID. Example: 77cb14a0-5eb0-4061-87ea-d618b85e8818`;
const TASK_UUID_MESSAGE = `Task must be a OpenThrottle task UUID. Example: 45a30762-92a9-42f4-90e0-2437c7ef26a8`;

/**
 * @description The UUID issues for the active target: a missing id when `requireTargetIds`, a
 * malformed one always.
 */
const validateTarget = (
  input: PlanRunOptions,
  requireTargetIds: boolean,
): PlanRunValidationIssue[] => {
  const isPlanMode = input.targetMode === 'plan';
  const id = (isPlanMode ? input.planId : input.taskId).trim();
  const prefix = isPlanMode ? 'plan' : 'task';

  if (id === '') {
    if (!requireTargetIds) {
      return [];
    }

    return [
      {
        code: `${prefix}_required`,
        message: `A OpenThrottle ${prefix} UUID is required`,
      },
    ];
  }

  if (isUuid(id)) {
    return [];
  }

  return [
    {
      code: `${prefix}_uuid`,
      message: isPlanMode ? PLAN_UUID_MESSAGE : TASK_UUID_MESSAGE,
    },
  ];
};

/**
 * @description Validates run options: target UUIDs, the optional agent timeout text, the
 * driver id, and the enqueue tuning shape (generated schema).
 */
export const validatePlanRunOptionsState = (
  input: PlanRunOptions,
  iterationTimeoutText: string,
  options?: ValidatePlanRunOptionsStateOptions,
):
  | { readonly ok: true }
  | {
      readonly issues: readonly PlanRunValidationIssue[];
      readonly ok: false;
    } => {
  const requireTargetIds = options?.requireTargetIds === true;
  const issues: PlanRunValidationIssue[] = [];

  const timeoutRaw = iterationTimeoutText.trim();
  if (timeoutRaw !== '') {
    const n = Number.parseInt(timeoutRaw, 10);
    if (Number.isNaN(n) || n < 1) {
      issues.push({
        code: 'iteration_timeout',
        message: 'Agent timeout must be a positive whole number of seconds',
      });
    }
  }

  const driver = input.driver.trim().toLowerCase();
  if (!PLAN_RUN_KNOWN_DRIVERS.some((known) => known === driver)) {
    issues.push({
      code: 'driver',
      message: `Unknown driver "${input.driver.trim()}". Supported: ${PLAN_RUN_KNOWN_DRIVERS.join(', ')}`,
    });
  }

  // A blank worktree name is the DEFAULT and means "derive plan-<short plan id> at enqueue", so it
  // is never an error.

  issues.push(...validateTarget(input, requireTargetIds));

  const merged: PlanRunOptions = {
    ...input,
    iterationTimeoutSeconds: parsePlanRunTimeoutSeconds(iterationTimeoutText),
  };

  const tuning = buildPlanRunTuningInput(merged);
  if (tuning !== undefined) {
    const parsed = PlanRunTuningInputSchema().safeParse(tuning);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      for (const msg of flat.formErrors) {
        issues.push({ code: 'enqueue_tuning_schema', message: msg });
      }

      for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
        if (msgs != null) {
          for (const m of msgs) {
            issues.push({ code: `enqueue_tuning_${key}`, message: m });
          }
        }
      }
    } else if (
      parsed.data.iterationTimeoutSeconds != null &&
      (!Number.isFinite(parsed.data.iterationTimeoutSeconds) ||
        parsed.data.iterationTimeoutSeconds < 1)
    ) {
      issues.push({
        code: 'enqueue_iteration_timeout',
        message: 'Run tuning: the agent timeout must be a positive integer',
      });
    }
  }

  if (issues.length === 0) {
    return { ok: true };
  }

  return { issues, ok: false };
};
