/**
 * @description Whether the demo database is still clean enough to film a
 * mutating flow against.
 *
 * The seed is idempotent. A **flow** is not. `03-first-plan` creates a plan on
 * camera, and the flows for a rule, a note and a promoted plan will do the same:
 * take 1 leaves the row behind, so take 2 films a list that already contains it
 * and take 5 films four duplicates. Nobody had been bitten badly by this because
 * only one flow mutated and re-seeding between takes was a habit rather than a
 * rule. Four more mutating flows is where a habit stops being enough.
 *
 * Of the three options on the table, this implements the first:
 *
 * 1. **Declare it and refuse.** A flow says `mutates: true`; the recorder
 *    refuses to run it against a database that has already been filmed since it
 *    was seeded, and says how to re-seed.
 * 2. **A take-stamped title.** Rejected: the title is on camera, and
 *    "Add rate limiting to the public API (take 3)" reads to a viewer as a bug
 *    in the product.
 * 3. **Roll back after the take.** More machinery, and the failure mode is
 *    exactly backwards — a take that crashes is the one that most needs cleaning
 *    up and the one least likely to reach its own cleanup.
 *
 * ## Why an mtime and not a row in the database
 *
 * The truest signal would be a `seeded_at` column, but the demo database is the
 * production schema with demo data in it — adding a table to it for the benefit
 * of the video pipeline would make the schema carry the pipeline's concerns, and
 * the snapshot exporter would then have to classify it.
 *
 * Two file mtimes under `output/` (already gitignored, already where takes land)
 * answer the same question: the seed stamps a marker, a take stamps its own
 * directory, and a marker older than the take means the take happened after the
 * seed. That is not a proof the database is dirty — the take may have been a
 * read-only flow — but this is only ever consulted for flows that have declared
 * themselves mutating, and it is consulted per flow, so a take of a different
 * flow does not block this one.
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { outputRoot } from './format';

const MARKER = '.demo-seeded-at';

/** Where the seed records that it ran. */
export const seedMarkerPath = (): string => join(outputRoot(), MARKER);

/**
 * @public Stamp the demo workspace as freshly seeded.
 *
 * Called at the end of `scripts/seed-demo.ts`, after the data is actually in
 * place — a marker written before a seed that then fails is worse than no marker
 * at all, because it says the opposite of the truth.
 */
export const writeSeedMarker = (now: Date): void => {
  mkdirSync(outputRoot(), { recursive: true });
  writeFileSync(seedMarkerPath(), `${now.toISOString()}\n`, 'utf8');
};

const modifiedAt = (path: string): number | null =>
  existsSync(path) ? statSync(path).mtimeMs : null;

export interface DirtyVerdict {
  /** True when a take of this flow has landed since the last seed. */
  readonly dirty: boolean;
  /** Why, in the words the recorder should print. */
  readonly reason: string;
}

/**
 * @public Has this flow already been filmed since the demo data was seeded?
 *
 * `unknown` cases resolve to NOT dirty, deliberately. A missing marker means the
 * seed predates this check rather than that the data is dirty, and refusing to
 * record because a file is absent would make the first run after an upgrade fail
 * for a reason that has nothing to do with the data.
 */
export const isDemoDataDirty = (flowId: string): DirtyVerdict => {
  const seededAt = modifiedAt(seedMarkerPath());
  const takenAt = modifiedAt(join(outputRoot(), flowId, 'manifest.json'));

  if (seededAt === null) {
    return {
      dirty: false,
      reason:
        'no seed marker — the demo workspace predates this check, so its state cannot be judged',
    };
  }

  if (takenAt === null) {
    return { dirty: false, reason: 'no previous take of this flow' };
  }

  if (takenAt <= seededAt) {
    return { dirty: false, reason: 'seeded since the last take' };
  }

  return {
    dirty: true,
    reason:
      `'${flowId}' was last recorded at ${new Date(takenAt).toISOString()}, after the demo workspace was seeded at ${new Date(seededAt).toISOString()}. ` +
      'This flow declares `mutates: true`, so that take left its own rows behind and this one would film them — a list that already contains the thing the video is about to create.',
  };
};
