import { DEFAULT_PLAN_RUN_CONTAINMENT_HOSTS } from './plan-run-config-containment.constants.ts';
import type {
  PlanRunConfigStorage,
  PlanRunContainmentProfile,
} from './plan-run-config-storage.types.ts';

/**
 * @description Default profile for every unattended run (OT Loop, Ralph, scheduled and
 * webhook-triggered jobs): writes limited to the worktree, egress limited to
 * {@link DEFAULT_PLAN_RUN_CONTAINMENT_HOSTS}. Maintainer decision 2026-11-22.
 * @public
 */
export const getDefaultPlanRunContainmentProfile =
  (): PlanRunContainmentProfile => {
    return {
      filesystem: 'worktree-write',
      network: {
        hosts: [...DEFAULT_PLAN_RUN_CONTAINMENT_HOSTS],
        mode: 'allowlist',
      },
    };
  };

/**
 * @description The profile a run actually gets: the stored one when set, otherwise the default, so
 * a config written before containment existed is contained too.
 * @public
 */
export const resolvePlanRunContainmentProfile = (
  config: Pick<PlanRunConfigStorage, 'containment'>,
): PlanRunContainmentProfile => {
  return config.containment ?? getDefaultPlanRunContainmentProfile();
};
