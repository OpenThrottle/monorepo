/** The shared bucket for rows the active grouping cannot attribute. */
export const UNATTRIBUTED_LANE_KEY = 'unattributed';

/** Scheduled jobs are not plan-scoped, so they get their own lane under BY_PLAN. */
export const SCHEDULED_LANE_KEY = 'scheduled';

/** `skill_usage_events` has no plan link, so grilling lives in its own lane. */
export const SKILLS_LANE_KEY = 'skills';
