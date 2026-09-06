/**
 * @description Whether a timeline window still needs the grilling scope
 * disclosure.
 *
 * `skill_usage_events.user_id` (migration 110) is stamped at ingest and is
 * deliberately never backfilled, so a window can hold a mix of attributed and
 * unattributed grilling rows. Disclosing unconditionally would keep claiming
 * the lane is never user-scoped after it is; dropping the disclosure outright
 * would present a branch-placed row as if someone were named. So the view asks
 * the data.
 */

import { TimelineMarkerKind } from '../config/kinds';
import type { TimelineMarker } from '../types';

/**
 * TRUE when at least one GRILLING marker in `markers` carries no `userId` and
 * is therefore placed by branch rather than by who ran it.
 */
export const hasUnattributedGrilling = (
  markers: readonly TimelineMarker[],
): boolean =>
  markers.some(
    (marker) =>
      marker.kind === TimelineMarkerKind.Grilling && marker.userId == null,
  );
