/**
 * Which index entries are ready to be demoted to the archive.
 *
 * The index's size problem is entry **count**, not verbosity, and the arithmetic
 * settles it: ~184 entries × ~68 characters of irreducible link syntax is 12.5KB
 * before a single word of hook. At the target budget that leaves ~27 characters
 * each, and `OT 6d0c1431 PENDING` is already 19 — so a shortening pass ends with
 * a list that can no longer tell you which file to open. Shortening is not a
 * lever. Demotion is: moving landed plans into `landed-plans-archive.md` once
 * collapsed 57 memories into a single index line, with every file still readable.
 *
 * That pass was done by hand. This makes the rule explicit and testable.
 *
 * The rule is deliberately CONSERVATIVE. It proposes; a human or the weekly job
 * disposes. A false positive here deletes a memory's visibility, so every
 * condition must be affirmatively true — an unknown is never treated as a yes.
 */
import type { PlanReferenceClaim, PrReferenceClaim } from './claims';
import { planStatusClaim } from './claims';
import type { ObservedPlan, ObservedPr } from './reconcile';
import { observedPrState } from './reconcile';
import { prStateClaim } from './claims';

/**
 * Phrases marking work still owed on an entry whose plan has landed.
 *
 * Drawn from the real index: "leak-audit #290 + owner revoke owed", "visual pass
 * BLOCKED", "re-land or retire", "chalk fix stranded on a backup branch". An
 * entry carrying any of these is NOT demotable however green its plan looks —
 * the plan landing is not the same as the work being finished.
 */
const OWED_FOLLOWUP_PATTERNS: readonly RegExp[] = [
  /\bowed\b/i,
  /\bBLOCKED\b/i,
  /\bstranded\b/i,
  /\bre-?land\b/i,
  /\bretire\b/i,
  /\bfollow-?ups?\b/i,
  /\bTODO\b/i,
  /\bpending\b/i,
  /\bawaiting\b/i,
  /\bnot yet\b/i,
];

/**
 * Markers that an entry's durable value is its **gotcha**, not its plan status.
 *
 * The explicit exception the rule needs. `- [Client/node boundary guard](…) —
 * a69a8b4c DONE, PR #476 OPEN; Vite emits NO warning` is worth keeping visible
 * forever: the plan is incidental, the "Vite emits NO warning" is the memory.
 * Demoting it would archive a fact someone will need and no longer be told.
 *
 * Detected structurally rather than by sentiment: a hook whose final clause
 * carries no plan id and no PR reference is making a standalone claim about the
 * world, which is exactly the shape a gotcha takes.
 */
const REFERENCE_SHAPED = /#\d+|\b[0-9a-f]{8}\b/;

export interface DemotionCandidate {
  /** Index line number. */
  readonly line: number;
  /** Why this entry qualifies, for the report. */
  readonly reason: string;
  /** Entry title. */
  readonly title: string;
}

export interface DemotionBlocked {
  /** Index line number. */
  readonly line: number;
  /** Why it was NOT demoted — the interesting half of the output. */
  readonly reason: string;
  readonly title: string;
}

export interface DemotionReport {
  /** Entries eligible for the archive. */
  readonly candidates: readonly DemotionCandidate[];
  /** Entries that looked landed but are held back, and why. */
  readonly held: readonly DemotionBlocked[];
}

/** Does the hook carry a gotcha — a clause asserting something beyond the bookkeeping? */
export const carriesGotcha = (hook: string): boolean => {
  const clauses = hook
    .split(/[;]/)
    .map((clause) => clause.trim())
    .filter((clause) => clause !== '');
  if (clauses.length < 2) return false;
  // Index arithmetic, not `.at(-1)`: this package's build `lib` predates ES2022,
  // so `.at` type-checks in the test config and fails the build (TS2550).
  const last = clauses[clauses.length - 1] ?? '';
  // Long enough to be a claim rather than a stray word, and free of references.
  return !REFERENCE_SHAPED.test(last) && last.length >= 12;
};

export const hasOwedFollowup = (hook: string): boolean =>
  OWED_FOLLOWUP_PATTERNS.some((pattern) => pattern.test(hook));

export interface DemotionInput {
  /** One entry per index line, with its full hook text. */
  readonly entries: readonly {
    readonly hook: string;
    readonly line: number;
    readonly title: string;
  }[];
  readonly planClaims: readonly PlanReferenceClaim[];
  readonly plans: readonly ObservedPlan[];
  readonly prClaims: readonly PrReferenceClaim[];
  readonly prs: ReadonlyMap<number, ObservedPr>;
}

/**
 * Propose demotions. An entry qualifies only when ALL of:
 * every plan it names is COMPLETED, every PR it names is merged or closed, it
 * names at least one of those, it carries no owed follow-up, and its durable
 * value is not a gotcha.
 */
export const findDemotionCandidates = ({
  entries,
  planClaims,
  plans,
  prClaims,
  prs,
}: DemotionInput): DemotionReport => {
  const candidates: DemotionCandidate[] = [];
  const held: DemotionBlocked[] = [];

  for (const entry of entries) {
    const entryPlans = planClaims.filter((claim) => claim.line === entry.line);
    const entryPrs = prClaims.filter((claim) => claim.line === entry.line);

    if (entryPlans.length === 0 && entryPrs.length === 0) continue;

    const resolvedPlans = entryPlans.map((claim) =>
      plans.find((plan) =>
        plan.id.toLowerCase().startsWith(claim.planId.toLowerCase()),
      ),
    );
    // An unresolved plan is an unknown, and an unknown is never a yes.
    if (resolvedPlans.some((plan) => plan === undefined)) {
      held.push({
        line: entry.line,
        reason: 'names a plan that could not be resolved',
        title: entry.title,
      });
      continue;
    }

    const allPlansDone = resolvedPlans.every(
      (plan) => plan?.status.toUpperCase() === planStatusClaim.completed,
    );
    if (!allPlansDone) {
      held.push({
        line: entry.line,
        reason: 'a plan it names is not COMPLETED',
        title: entry.title,
      });
      continue;
    }

    const resolvedPrs = entryPrs.map((claim) => prs.get(claim.number));
    if (resolvedPrs.some((pr) => pr === undefined)) {
      held.push({
        line: entry.line,
        reason: 'names a PR that could not be resolved',
        title: entry.title,
      });
      continue;
    }

    const allPrsSettled = resolvedPrs.every((pr) => {
      if (pr === undefined) return false;
      const state = observedPrState(pr);
      return state === prStateClaim.merged || state === prStateClaim.closed;
    });
    if (!allPrsSettled) {
      held.push({
        line: entry.line,
        reason: 'a PR it names is still open',
        title: entry.title,
      });
      continue;
    }

    if (hasOwedFollowup(entry.hook)) {
      held.push({
        line: entry.line,
        reason: 'carries an owed follow-up',
        title: entry.title,
      });
      continue;
    }

    if (carriesGotcha(entry.hook)) {
      held.push({
        line: entry.line,
        reason: 'its durable value is the gotcha, not the plan status',
        title: entry.title,
      });
      continue;
    }

    candidates.push({
      line: entry.line,
      reason: 'plan(s) COMPLETED, PR(s) settled, nothing owed',
      title: entry.title,
    });
  }

  return { candidates, held };
};
