import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { PLAN_RUN_DEFAULTS_FILENAME } from '../../data/plan-run-config.ts';

/**
 * @description Writes `.openthrottle/ot-loop.json` under `dir` with the given `defaults` block
 * (or the raw string when a test needs malformed JSON).
 */
export const writePlanRunDefaults = (
  dir: string,
  defaults: Record<string, unknown> | string,
  extra: Record<string, unknown> = {},
): void => {
  const filePath = join(dir, PLAN_RUN_DEFAULTS_FILENAME);
  mkdirSync(dirname(filePath), { recursive: true });
  const isRaw = typeof defaults === 'string';
  const body = isRaw ? defaults : JSON.stringify({ ...extra, defaults });
  writeFileSync(filePath, body, 'utf8');
};
