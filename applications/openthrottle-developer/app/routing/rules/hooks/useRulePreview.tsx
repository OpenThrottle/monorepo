import * as React from 'react';
import { useFetcher } from 'react-router';

import {
  RULE_PREVIEW_DEBOUNCE_MS,
  RULE_PREVIEW_PATH,
} from '~/routing/rules/config/rule-preview';
import type { RulePreviewState } from '~/routing/rules/types';
import type { RulePreviewMatch } from '~/routing/rules/utils/rule-preview-params';
import { buildRulePreviewQuery } from '~/routing/rules/utils/rule-preview-params';

export interface UseRulePreviewOptions {
  readonly debounceMs?: number;
  /** The rule form's current match fields; the preview follows them. */
  readonly match: RulePreviewMatch;
}

export interface UseRulePreviewResult {
  readonly loading: boolean;
  /** The latest resolved preview; null until the first response arrives. */
  readonly state: RulePreviewState | null;
}

/**
 * @description Live dry run for the rule form: debounces a `useFetcher().load` against the rule
 * preview resource route whenever a match field changes, so "matches N plans" tracks what the user
 * is editing without a save. The form (`useRuleForm`) stays the one owner of the field state; this
 * hook only reads it. While a request is pending the previous result stays visible.
 */
export const useRulePreview = (
  options: UseRulePreviewOptions,
): UseRulePreviewResult => {
  const { match } = options;
  const debounceMs = options.debounceMs ?? RULE_PREVIEW_DEBOUNCE_MS;

  // Hooks
  const fetcher = useFetcher<RulePreviewState>();
  const [pending, setPending] = React.useState(true);

  // Setup
  // The query string is the effect key, so a new `tagAll` array with the
  // same contents does not retrigger the request.
  const query = buildRulePreviewQuery({ evaluateEnvironment: null, match });
  // `load` changes identity every render; read the latest through a ref.
  const loadRef = React.useRef(fetcher.load);
  const loading = pending || fetcher.state === 'loading';

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    loadRef.current = fetcher.load;
  }, [fetcher.load]);

  React.useEffect(() => {
    setPending(true);
    const timeout = setTimeout(() => {
      setPending(false);
      void loadRef.current(`${RULE_PREVIEW_PATH}?${query}`);
    }, debounceMs);

    return () => {
      clearTimeout(timeout);
    };
  }, [debounceMs, query]);

  // 🔌 Short Circuit

  return { loading, state: fetcher.data ?? null };
};
