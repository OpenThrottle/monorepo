/**
 * @description URL and client-side list helpers for the rules index. Search (`q`)
 * and enabled filter (`all|enabled|disabled`) are parsed from search params; the
 * list is narrowed in-memory so loader GraphQL stays unchanged.
 */

export const RULES_ENABLED_FILTERS = ['all', 'disabled', 'enabled'] as const;

export type RulesEnabledFilter = (typeof RULES_ENABLED_FILTERS)[number];

export interface RulesListFilterable {
  actionType: string;
  enabled: boolean;
  environment?: string | null;
  status?: string | null;
  tagAll: readonly string[];
  title: string;
}

export const isRulesEnabledFilter = (
  value: string,
): value is RulesEnabledFilter =>
  RULES_ENABLED_FILTERS.some((filter) => filter === value);

/**
 * @description Reads `q` from URL search params; empty string when missing.
 */
export function parseRulesSearchFromSearchParams(
  searchParams: URLSearchParams,
): string {
  return searchParams.get('q') ?? '';
}

/**
 * @description Reads `enabled` from URL search params; defaults to `all` when
 * missing or invalid (including Radix empty-deselect `''`).
 */
export function parseRulesEnabledFilterFromSearchParams(
  searchParams: URLSearchParams,
): RulesEnabledFilter {
  const raw = searchParams.get('enabled') ?? '';
  return isRulesEnabledFilter(raw) ? raw : 'all';
}

/**
 * @description Client-side filter: optional case-insensitive `q` over title,
 * action type, tags, status, and environment; optional enabled slice.
 */
export function filterRulesList<T extends RulesListFilterable>(
  rules: readonly T[],
  options: {
    enabledFilter?: RulesEnabledFilter;
    search?: string;
  },
): T[] {
  const enabledFilter = options.enabledFilter ?? 'all';
  const q = (options.search ?? '').trim().toLowerCase();

  return rules.filter((rule) => {
    if (enabledFilter === 'enabled' && !rule.enabled) {
      return false;
    }

    if (enabledFilter === 'disabled' && rule.enabled) {
      return false;
    }

    if (q === '') {
      return true;
    }

    const haystack = [
      rule.actionType,
      rule.environment ?? '',
      rule.status ?? '',
      rule.title,
      ...rule.tagAll,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}
