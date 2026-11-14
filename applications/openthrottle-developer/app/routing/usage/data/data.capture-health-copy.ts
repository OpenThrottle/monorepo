/**
 * @description Static copy for the Usage-route capture-health section.
 * Component files stay presentational; labels and messages live here (nearest
 * `data/` folder).
 */

import { CAPTURE_HEALTH_STALE_AFTER_HOURS } from '~/routing/usage/data/data.capture-health';

/** Display labels for the server's capture-health stream names. */
export const CAPTURE_HEALTH_STREAM_LABELS: Readonly<Record<string, string>> = {
  skill_events: `Skill invocations`,
  skill_outcomes: `Skill outcomes`,
  token_usage: `Token usage`,
};

export const CAPTURE_HEALTH_COPY = {
  columnLastCaptured: `Last captured`,
  columnSource: `Source`,
  columnStatus: `Status`,
  columnStream: `Stream`,
  freshStatus: `OK`,
  heading: `Capture health`,
  intro: `When telemetry from each tool last reached the server. Quiet usage charts can mean nothing happened or that capture broke; this tells them apart. Which machines and repos are reporting is under Telemetry coverage below.`,
  noRowsDescription: `No skill or token telemetry has ever been received. If you have used an agent CLI with the OpenThrottle hooks installed, capture is not working.`,
  noRowsTitle: `Nothing has been captured`,
  staleNotice: (sources: readonly string[]): string =>
    `No telemetry from ${sources.join(', ')} in over ${CAPTURE_HEALTH_STALE_AFTER_HOURS} h. That is expected if you have not used ${sources.length === 1 ? 'it' : 'them'} since; if you have, capture may be broken.`,
  staleStatus: `Stale`,
} as const;
