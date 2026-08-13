import {
  isRolloutFlagKind,
  type RolloutFlagKind,
} from '../config/rollout-flag-kind';
import type {
  RolloutEvaluation,
  RolloutFlagCatalog,
  RolloutFlagValueByKind,
} from '../types';
import {
  defaultsFromCatalog,
  freezeResolvedValues,
  type RolloutResolvedValues,
} from './defaults-from-catalog';
import { parseRolloutValueJson } from './parse-rollout-value-json';

export type MergeRolloutEvaluationsOptions = {
  readonly onWarn?: (message: string) => void;
  readonly strict?: boolean;
};

type MutableResolvedValues = Record<
  string,
  RolloutFlagValueByKind[RolloutFlagKind]
>;

const defaultWarn = (message: string): void => {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`@openthrottle/react-router-rollout: ${message}`);
  }
};

/**
 * Merge server evaluations onto catalog defaults. Missing / mismatched server
 * entries keep the catalog default; unknown server keys are ignored (warn when
 * `strict`).
 *
 * @public
 */
export const mergeRolloutEvaluations = <TCatalog extends RolloutFlagCatalog>(
  catalog: TCatalog,
  evaluations: readonly RolloutEvaluation[],
  options: MergeRolloutEvaluationsOptions = {},
): RolloutResolvedValues<TCatalog> => {
  const onWarn = options.onWarn ?? defaultWarn;
  const values: MutableResolvedValues = {
    ...defaultsFromCatalog(catalog),
  };
  const seenCatalogKeys = new Set<string>();

  for (const evaluation of evaluations) {
    const definition = catalog[evaluation.key];
    if (definition === undefined) {
      if (options.strict) {
        onWarn(`ignoring unknown server flag "${evaluation.key}"`);
      }
      continue;
    }

    seenCatalogKeys.add(evaluation.key);

    if (!isRolloutFlagKind(evaluation.kind)) {
      onWarn(
        `flag "${evaluation.key}" has unknown server kind "${String(evaluation.kind)}"; using default`,
      );
      continue;
    }

    if (evaluation.kind !== definition.kind) {
      onWarn(
        `flag "${evaluation.key}" kind mismatch (catalog=${definition.kind}, server=${evaluation.kind}); using default`,
      );
      continue;
    }

    const kind: RolloutFlagKind = definition.kind;
    const parsed = parseRolloutValueJson(kind, evaluation.valueJson);
    if (parsed === undefined) {
      onWarn(
        `flag "${evaluation.key}" valueJson failed parse/kind check; using default`,
      );
      continue;
    }

    values[evaluation.key] = parsed;
  }

  for (const key of Object.keys(catalog)) {
    if (!seenCatalogKeys.has(key)) {
      onWarn(`flag "${key}" missing from server evaluations; using default`);
    }
  }

  return freezeResolvedValues(values);
};
