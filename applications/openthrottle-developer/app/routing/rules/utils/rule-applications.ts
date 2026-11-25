import type { RuleApplicationStateName } from '~/routing/rules/data/rule-application-states';
import { RULE_APPLICATION_STATE_ORDER } from '~/routing/rules/data/rule-application-states';

/** A ledger row as the rule detail page needs it (matches the loader selection). */
export interface RuleApplicationRowData {
  readonly createdAt: string;
  readonly detailsJson?: string | null;
  readonly id: string;
  readonly planId: string;
  readonly planTitle?: string | null;
  readonly ruleId: string;
  readonly state: string;
  readonly taskId?: string | null;
}

export interface RuleApplicationGroup {
  readonly applications: readonly RuleApplicationRowData[];
  readonly state: RuleApplicationStateName;
}

export interface RuleApplicationDetails {
  /** Remaining keys, rendered as `key: value`. */
  readonly extras: readonly (readonly [string, string])[];
  readonly promptId: string | null;
  readonly reason: string | null;
  /** The rule a `superseded-by` / `already-attached` row points at. */
  readonly ruleId: string | null;
}

const isKnownState = (state: string): state is RuleApplicationStateName => {
  return RULE_APPLICATION_STATE_ORDER.some((known) => known === state);
};

const asNonEmptyString = (value: unknown): string | null => {
  return typeof value === 'string' && value !== '' ? value : null;
};

/**
 * @description Buckets ledger rows by state in display order (flagged,
 * orphaned, applied, pre-satisfied). Empty groups are dropped, and rows with an
 * unrecognised state are left out rather than shown under a made-up heading.
 */
export const groupRuleApplicationsByState = (
  applications: readonly RuleApplicationRowData[],
): RuleApplicationGroup[] => {
  return RULE_APPLICATION_STATE_ORDER.map((state) => {
    return {
      applications: applications.filter((application) => {
        return isKnownState(application.state) && application.state === state;
      }),
      state,
    };
  }).filter((group) => group.applications.length > 0);
};

/**
 * @description Splits a ledger row's `detailsJson` into the fields the page
 * renders as labels and links (reason, ruleId, promptId) plus the leftover keys.
 * Unparseable or non-object JSON yields an empty result.
 */
export const parseRuleApplicationDetails = (
  detailsJson: string | null | undefined,
): RuleApplicationDetails => {
  const empty: RuleApplicationDetails = {
    extras: [],
    promptId: null,
    reason: null,
    ruleId: null,
  };
  if (detailsJson == null || detailsJson === '') return empty;

  let parsed: unknown;
  try {
    parsed = JSON.parse(detailsJson);
  } catch {
    return empty;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return empty;
  }

  const entries = Object.entries(parsed);
  const extras = entries
    .filter(([key]) => !['promptId', 'reason', 'ruleId'].includes(key))
    .map(([key, value]): readonly [string, string] => {
      return [key, typeof value === 'string' ? value : JSON.stringify(value)];
    });
  const lookup = new Map(entries);

  return {
    extras,
    promptId: asNonEmptyString(lookup.get('promptId')),
    reason: asNonEmptyString(lookup.get('reason')),
    ruleId: asNonEmptyString(lookup.get('ruleId')),
  };
};
