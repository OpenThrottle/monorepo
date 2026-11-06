/**
 * @description Server-only: parses a stored ATIF document for the trajectory
 * viewer. `@openthrottle/openthrottle-agentic-utils` pulls node built-ins, so
 * it must never reach the client bundle — the `.server.ts` suffix plus a
 * dynamic `import()` inside the route loader is what keeps it out (the same
 * boundary the IDE engine and skills discovery use). Components receive the
 * parsed, plain-JSON document.
 */
import { parseAtifTrajectoryJson } from '@openthrottle/openthrottle-agentic-utils';

import type { AtifTrajectory } from '~/routing/evals/types';

/**
 * @description The ATIF document stored as `trajectoryJson`; `null` when it is
 * not valid JSON or not a document the viewer can read, so the route can show
 * the summary alone instead of failing.
 */
export const parseTrajectoryDocument = (
  json: string,
): AtifTrajectory | null => {
  return parseAtifTrajectoryJson(json) ?? null;
};
