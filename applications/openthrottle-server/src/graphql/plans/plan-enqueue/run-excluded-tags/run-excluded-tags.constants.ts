/**
 * @description Plan tags that mean "never run this plan as coding work". A plan run resets the
 * plan's BACKLOG, PENDING, SKIPPED and BLOCKED tasks to QUEUED and hands them to an agent to
 * implement, so on a plan whose tasks are not code it would rewrite their approval state and try
 * to "implement" the content.
 *
 * - `no-plan-run`: a behaviour tag, not a subject, so any non-code plan opts out by carrying it
 *   without a code change here. The rolling @openthrottleai posts plan carries it (alongside
 *   `social` for its subject); its tasks are tweets and `@openthrottle/openthrottle-social` posts
 *   them.
 */
export const RUN_EXCLUDED_PLAN_TAGS: readonly string[] = ['no-plan-run'];

/** @description GraphQL `extensions.code` for a run refused because of one of those tags. */
export const PLAN_RUN_EXCLUDED_BY_TAG_CODE = 'PLAN_RUN_EXCLUDED_BY_TAG';
