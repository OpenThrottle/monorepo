/**
 * @description Static copy for the Usage-route capture-health section.
 * Component files stay presentational; labels and messages live here (nearest
 * `data/` folder).
 */

import { CAPTURE_HEALTH_STALE_AFTER_HOURS } from '~/routing/usage/data/capture-health';

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
  intro: `When telemetry from each tool last reached the server. Quiet usage charts can mean nothing happened or that capture broke; this tells them apart.`,
  noRowsDescription: `No skill or token telemetry has ever been received. If you have used an agent CLI with the OpenThrottle hooks installed, capture is not working.`,
  noRowsTitle: `Nothing has been captured`,
  staleDescription: (
    streamLabel: string,
    source: string,
    relativeLabel: string,
  ): string =>
    `${streamLabel} from ${source} last arrived ${relativeLabel}. If you have used ${source} since, capture may be broken.`,
  staleStatus: `Stale`,
  staleTitle: (streamLabel: string, source: string): string =>
    `${streamLabel}: no data from ${source} in over ${CAPTURE_HEALTH_STALE_AFTER_HOURS} h`,
} as const;

/** Display label for a stream name, falling back to the raw name. */
export const captureHealthStreamLabel = (stream: string): string =>
  CAPTURE_HEALTH_STREAM_LABELS[stream] ?? stream;
