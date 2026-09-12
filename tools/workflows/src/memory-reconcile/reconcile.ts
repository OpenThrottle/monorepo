/**
 * Compare the index's claims against observed reality and report ONLY the
 * disagreements.
 *
 * The honesty rule this module enforces: a claim is reported as wrong only when
 * the claim exists, the fact was actually observed, and the two conflict. Three
 * distinct things are therefore NOT findings —
 *
 * - a reference with no claim attached (nothing was asserted to be wrong),
 * - a claim whose subject could not be resolved (the PR or plan was not found),
 * - anything the entry says in prose.
 *
 * Silence about those is the point. A reconcile that guessed would drift the
 * index it exists to keep honest.
 */
import type {
  IndexClaims,
  PlanStatusClaim,
  PrReferenceClaim,
  PrStateClaim,
} from './claims';
import { planStatusClaim, prStateClaim } from './claims';

/** Observed state of a pull request. */
export interface ObservedPr {
  readonly isDraft: boolean;
  readonly merged: boolean;
  readonly number: number;
  /** GitHub's own state: OPEN, CLOSED or MERGED. */
  readonly state: string;
}

/** Observed state of an OT plan. */
export interface ObservedPlan {
  readonly id: string;
  readonly status: string;
}

export interface Disagreement {
  /** What the index asserts. */
  readonly claimed: string;
  /** Index line number. */
  readonly line: number;
  /** What was actually observed. */
  readonly observed: string;
  /** `pr` or `plan`. */
  readonly subject: string;
  /** The clause the claim was read from. */
  readonly text: string;
  readonly title: string;
}

export interface ReconcileReport {
  /** Counts, so the report can say what it did and did not cover. */
  readonly coverage: {
    readonly plansChecked: number;
    readonly plansClaimed: number;
    readonly prsChecked: number;
    readonly prsClaimed: number;
  };
  /** Claims that conflict with observed reality. The only actionable output. */
  readonly disagreements: readonly Disagreement[];
  /** References the index makes but whose subject was not found. Reported separately — not as drift. */
  readonly unresolved: readonly string[];
}

/** Normalize an observed PR into the vocabulary the index uses. */
export const observedPrState = (pr: ObservedPr): PrStateClaim => {
  if (pr.merged || pr.state.toUpperCase() === 'MERGED') {
    return prStateClaim.merged;
  }
  if (pr.state.toUpperCase() === 'CLOSED') return prStateClaim.closed;
  return pr.isDraft ? prStateClaim.draft : prStateClaim.open;
};

/**
 * Does the claimed PR state conflict with what was observed?
 *
 * Not string equality — the index's vocabulary is looser than GitHub's and the
 * looseness is legitimate:
 *
 * - `DRAFT` is a kind of `OPEN`, so claiming "open" about a draft is not wrong.
 * - `UNMERGED` asserts only "not merged", which both OPEN and CLOSED satisfy.
 * - `CLOSED` in the index is used for closed-without-merging, which is exactly
 *   how GitHub reports it once `merged` is false.
 */
export const prClaimConflicts = (
  claimed: PrStateClaim,
  observed: PrStateClaim,
): boolean => {
  if (claimed === observed) return false;

  if (claimed === prStateClaim.unmerged) {
    return observed === prStateClaim.merged;
  }
  if (claimed === prStateClaim.open) {
    return observed !== prStateClaim.draft;
  }
  if (claimed === prStateClaim.draft) {
    return observed !== prStateClaim.open;
  }
  return true;
};

/** Match an index plan reference (8-hex short form or full UUID) to an observed plan id. */
const matchesPlanId = (claimId: string, observedId: string): boolean =>
  observedId.toLowerCase().startsWith(claimId.toLowerCase());

const planClaimConflicts = (
  claimed: PlanStatusClaim,
  observedStatus: string,
): boolean => {
  const observed = observedStatus.toUpperCase();
  // The index writes DONE for COMPLETED; everything else is the literal status.
  if (claimed === planStatusClaim.completed) return observed !== 'COMPLETED';
  return claimed !== observed;
};

const describePr = (claim: PrReferenceClaim): string => `PR #${claim.number}`;

export interface ReconcileInput {
  readonly claims: IndexClaims;
  /** Observed plans, keyed however the caller found them; matched by id prefix. */
  readonly plans: readonly ObservedPlan[];
  /** Observed PRs, by number. */
  readonly prs: ReadonlyMap<number, ObservedPr>;
}

export const reconcile = ({
  claims,
  plans,
  prs,
}: ReconcileInput): ReconcileReport => {
  const disagreements: Disagreement[] = [];
  const unresolved: string[] = [];

  const claimedPrs = claims.prs.filter((claim) => claim.state !== null);
  const claimedPlans = claims.plans.filter((claim) => claim.status !== null);

  let prsChecked = 0;
  for (const claim of claimedPrs) {
    const observed = prs.get(claim.number);
    if (!observed) {
      unresolved.push(`${describePr(claim)} (line ${claim.line}) — not found`);
      continue;
    }
    prsChecked += 1;

    const observedState = observedPrState(observed);
    // `state` is non-null by the filter above; re-read it for the narrowing.
    const claimedState = claim.state;
    if (claimedState === null) continue;
    if (prClaimConflicts(claimedState, observedState)) {
      disagreements.push({
        claimed: claimedState,
        line: claim.line,
        observed: observedState,
        subject: describePr(claim),
        text: claim.text,
        title: claim.title,
      });
    }
  }

  let plansChecked = 0;
  for (const claim of claimedPlans) {
    const observed = plans.find((plan) => matchesPlanId(claim.planId, plan.id));
    if (!observed) {
      unresolved.push(`plan ${claim.planId} (line ${claim.line}) — not found`);
      continue;
    }
    plansChecked += 1;

    const claimedStatus = claim.status;
    if (claimedStatus === null) continue;
    if (planClaimConflicts(claimedStatus, observed.status)) {
      disagreements.push({
        claimed: claimedStatus,
        line: claim.line,
        observed: observed.status.toUpperCase(),
        subject: `plan ${claim.planId}`,
        text: claim.text,
        title: claim.title,
      });
    }
  }

  return {
    coverage: {
      plansChecked,
      plansClaimed: claimedPlans.length,
      prsChecked,
      prsClaimed: claimedPrs.length,
    },
    disagreements,
    unresolved,
  };
};

/**
 * Render the report.
 *
 * Ends by stating what was NOT checked. Without that line a clean run reads as
 * "the index is accurate", which this cannot establish — it can only establish
 * that the claims it could machine-check agree.
 */
export const formatReconcileReport = (
  report: ReconcileReport,
  totals: { readonly planRefs: number; readonly prRefs: number },
): string => {
  const lines: string[] = [];

  if (report.disagreements.length === 0) {
    lines.push('No disagreements found.');
  } else {
    lines.push(`${report.disagreements.length} disagreement(s):`);
    lines.push('');
    for (const item of report.disagreements) {
      lines.push(`  line ${item.line} — ${item.title}`);
      lines.push(
        `    ${item.subject}: index says ${item.claimed}, actually ${item.observed}`,
      );
      lines.push(`    claim: "${item.text}"`);
      lines.push('');
    }
  }

  if (report.unresolved.length > 0) {
    lines.push(
      `${report.unresolved.length} reference(s) could not be resolved (NOT reported as drift):`,
    );
    for (const item of report.unresolved) lines.push(`  ${item}`);
    lines.push('');
  }

  const { coverage } = report;
  lines.push('Coverage:');
  lines.push(
    `  PRs:   ${coverage.prsChecked} checked of ${coverage.prsClaimed} claimed, out of ${totals.prRefs} referenced`,
  );
  lines.push(
    `  Plans: ${coverage.plansChecked} checked of ${coverage.plansClaimed} claimed, out of ${totals.planRefs} referenced`,
  );
  lines.push('');
  lines.push(
    'NOT checked: every prose hook, and every reference carrying no explicit state',
  );
  lines.push(
    'word. This says the machine-checkable claims agree — it does NOT say the index',
  );
  lines.push('is accurate.');

  return lines.join('\n');
};
