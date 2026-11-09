import {
  SCHEDULED_LANE_KEY,
  SKILLS_LANE_KEY,
  UNATTRIBUTED_LANE_KEY,
} from './timeline.constants.ts';
/**
 * @description Pure lane-key derivation for the workstream timeline. Every span
 * and marker kind must resolve a lane under every grouping mode; rows with
 * nothing to group on collapse into one shared "Unattributed" lane rather than
 * N single-row lanes. Kept out of the resolver so it is testable without SQL.
 */
import { TimelineLaneGrouping } from './timeline.enum.ts';
import type {
  TimelineLane,
  TimelineLaneFacts,
  TimelineLaneOverride,
} from './timeline.types.ts';
const UNATTRIBUTED_LANE: TimelineLane = {
  key: UNATTRIBUTED_LANE_KEY,
  label: 'Unattributed',
};
const FIXED_LANES: Record<'scheduled' | 'skills', TimelineLane> = {
  scheduled: { key: SCHEDULED_LANE_KEY, label: 'Scheduled jobs' },
  skills: { key: SKILLS_LANE_KEY, label: 'Skills' },
};

const isPresent = (value: string | null | undefined): value is string => {
  return value != null && value !== '';
};

const byPlan = (facts: TimelineLaneFacts): TimelineLane => {
  if (!isPresent(facts.planId)) return UNATTRIBUTED_LANE;

  return {
    key: `plan:${facts.planId}`,
    label: isPresent(facts.planTitle) ? facts.planTitle : facts.planId,
  };
};

const byCheckout = (facts: TimelineLaneFacts): TimelineLane => {
  if (isPresent(facts.checkoutId)) {
    return { key: `checkout:${facts.checkoutId}`, label: facts.checkoutId };
  }

  // Branch is the documented fallback: a run that never resolved a checkout id
  // still tells you which branch it touched, which is the question this mode
  // is actually being asked.
  if (isPresent(facts.branch)) {
    return { key: `branch:${facts.branch}`, label: facts.branch };
  }

  return UNATTRIBUTED_LANE;
};

const byBackend = (facts: TimelineLaneFacts): TimelineLane => {
  if (!isPresent(facts.backend)) return UNATTRIBUTED_LANE;

  return { key: `backend:${facts.backend}`, label: facts.backend };
};

/**
 * Resolve the lane a row lands in.
 *
 * `override` wins over the grouping only under BY_PLAN, where the fixed lanes
 * exist because the source has no plan to group by. Under the other modes the
 * row's own facts are better than a fixed bucket — a scheduled run does know
 * its checkout and its driver.
 */
export function resolveTimelineLane(
  grouping: TimelineLaneGrouping,
  facts: TimelineLaneFacts,
  override: TimelineLaneOverride = null,
): TimelineLane {
  if (override != null && grouping === TimelineLaneGrouping.BY_PLAN) {
    return FIXED_LANES[override];
  }

  if (grouping === TimelineLaneGrouping.BY_CHECKOUT) return byCheckout(facts);
  if (grouping === TimelineLaneGrouping.BY_BACKEND) return byBackend(facts);

  return byPlan(facts);
}
