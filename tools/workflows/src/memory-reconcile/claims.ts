/**
 * Parse the claims a memory index makes about the world.
 *
 * Index entries assert things that can go stale — "PR #435 merged", "plan
 * 70377fcc DONE", "blocked on #457". Nothing checks them, so on one pass 20 of
 * 57 PR references claimed "(unmerged)" for PRs that had merged, and three named
 * blockers that had already cleared.
 *
 * This module extracts only what is **mechanically checkable**: a PR number with
 * an explicit state word, and an OT plan id with an explicit status word. An
 * entry's prose gotcha ("Vite emits NO warning") is not a claim about the world
 * this can resolve, so it is not extracted and never reported on — reporting a
 * clean bill of health over material it cannot read would be worse than silence.
 */

/** Entry line shape: `- [Title](file.md) — hook text`. */
const ENTRY_PATTERN =
  /^\s*[-*]\s*\[([^\]]*)\]\(([^)]*)\)\s*(?:—|-{1,2}|:)?\s*(.*)$/;

/** A PR reference: `#123`, optionally prefixed `PR `. */
const PR_PATTERN = /#(\d{1,6})\b/g;

/**
 * An OT plan id: the 8-hex short form the index uses, or a full UUID.
 * Bounded by non-hex so a longer hex run (a commit sha) is not mistaken for one.
 */
const PLAN_ID_PATTERN =
  /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{8})\b/g;

/** PR state words an entry may assert, normalized. */
export const prStateClaim = {
  closed: 'CLOSED',
  draft: 'DRAFT',
  merged: 'MERGED',
  open: 'OPEN',
  unmerged: 'UNMERGED',
} as const;

export type PrStateClaim = (typeof prStateClaim)[keyof typeof prStateClaim];

/** Plan status words an entry may assert. `DONE` is the index's shorthand for COMPLETED. */
export const planStatusClaim = {
  blocked: 'BLOCKED',
  completed: 'COMPLETED',
  inProgress: 'IN_PROGRESS',
  pending: 'PENDING',
  queued: 'QUEUED',
} as const;

export type PlanStatusClaim =
  (typeof planStatusClaim)[keyof typeof planStatusClaim];

const PR_STATE_WORDS: ReadonlyArray<readonly [RegExp, PrStateClaim]> = [
  [/\bunmerged\b/i, prStateClaim.unmerged],
  [/\bmerged\b/i, prStateClaim.merged],
  [/\bclosed\b/i, prStateClaim.closed],
  [/\bdraft\b/i, prStateClaim.draft],
  [/\bopen\b/i, prStateClaim.open],
];

const PLAN_STATUS_WORDS: ReadonlyArray<readonly [RegExp, PlanStatusClaim]> = [
  [/\bIN[_ ]PROGRESS\b/i, planStatusClaim.inProgress],
  [/\bCOMPLETED\b|\bDONE\b/i, planStatusClaim.completed],
  [/\bBLOCKED\b/i, planStatusClaim.blocked],
  [/\bQUEUED\b/i, planStatusClaim.queued],
  [/\bPENDING\b/i, planStatusClaim.pending],
];

export interface PrReferenceClaim {
  /** Entry line number in the index. */
  readonly line: number;
  /** PR number. */
  readonly number: number;
  /** The state the entry asserts, or null when it names the PR without a claim. */
  readonly state: PrStateClaim | null;
  /** The segment the claim was read from, for the report. */
  readonly text: string;
  /** Entry title, for the report. */
  readonly title: string;
}

export interface PlanReferenceClaim {
  /** Entry line number in the index. */
  readonly line: number;
  /** Plan id as written — 8-hex short form or full UUID. */
  readonly planId: string;
  /** The status the entry asserts, or null when it names the plan without a claim. */
  readonly status: PlanStatusClaim | null;
  readonly text: string;
  readonly title: string;
}

export interface IndexClaims {
  readonly plans: readonly PlanReferenceClaim[];
  readonly prs: readonly PrReferenceClaim[];
}

/**
 * Split an entry's hook into clauses.
 *
 * Entries pack several independent assertions onto one line —
 * `70377fcc DONE #265; 097c23b7 PENDING` — so a state word must bind to the
 * reference in its OWN clause. Reading the whole line as one scope would let
 * `DONE` from the first clause attach to the plan in the second, manufacturing
 * disagreements that were never claimed.
 */
const splitClauses = (hook: string): readonly string[] =>
  hook
    .split(/[;,]/)
    .map((clause) => clause.trim())
    .filter((clause) => clause !== '');

const firstMatch = <T>(
  clause: string,
  words: ReadonlyArray<readonly [RegExp, T]>,
): T | null => {
  for (const [pattern, value] of words) {
    if (pattern.test(clause)) return value;
  }
  return null;
};

/** One index entry, with its hook text intact for rules that read the whole clause. */
export interface IndexEntry {
  /** Link target, e.g. `no-attribution-guard-plan.md`. */
  readonly file: string;
  /** The hook — everything after the link. */
  readonly hook: string;
  /** 1-based line number in the index. */
  readonly line: number;
  /** Link text. */
  readonly title: string;
}

/** Parse the index into its entries, hooks included. */
export const parseIndexEntries = (content: string): readonly IndexEntry[] => {
  const entries: IndexEntry[] = [];

  for (const [index, rawLine] of content.split('\n').entries()) {
    const match = ENTRY_PATTERN.exec(rawLine);
    if (!match) continue;
    entries.push({
      file: match[2] ?? '',
      hook: match[3] ?? '',
      line: index + 1,
      title: match[1] ?? '',
    });
  }

  return entries;
};

/** Extract every mechanically checkable claim the index makes. */
export const parseIndexClaims = (content: string): IndexClaims => {
  const prs: PrReferenceClaim[] = [];
  const plans: PlanReferenceClaim[] = [];

  for (const [index, rawLine] of content.split('\n').entries()) {
    const entry = ENTRY_PATTERN.exec(rawLine);
    if (!entry) continue;

    const line = index + 1;
    const title = entry[1] ?? '';
    const hook = entry[3] ?? '';

    for (const clause of splitClauses(hook)) {
      const prState = firstMatch(clause, PR_STATE_WORDS);
      const planStatus = firstMatch(clause, PLAN_STATUS_WORDS);

      for (const match of clause.matchAll(PR_PATTERN)) {
        const parsed = Number.parseInt(match[1] ?? '', 10);
        if (!Number.isFinite(parsed)) continue;
        prs.push({ line, number: parsed, state: prState, text: clause, title });
      }

      for (const match of clause.matchAll(PLAN_ID_PATTERN)) {
        const planId = match[1];
        if (planId === undefined) continue;
        plans.push({ line, planId, status: planStatus, text: clause, title });
      }
    }
  }

  return { plans, prs };
};
