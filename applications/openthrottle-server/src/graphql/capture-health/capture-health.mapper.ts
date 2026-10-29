import type { CaptureHealthRow } from '@openthrottle/nestjs-repositories';

import { CaptureHealthRowObject } from './capture-health.object.ts';

/** Maps a repository capture-health row to its GraphQL object. */
export const toCaptureHealthRowObject = (
  row: CaptureHealthRow,
): CaptureHealthRowObject => {
  const object = new CaptureHealthRowObject();

  object.lastCapturedAt = row.lastCapturedAt;
  object.source = row.source;
  object.stream = row.stream;

  return object;
};
