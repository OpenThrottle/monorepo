import { CustomPromptType } from '~/__generated__/graphql';
import {
  PROMPTS_SORT_BY,
  PROMPTS_SORT_ORDER,
  PromptsSortBy,
  PromptsSortOrder,
} from '~/routing/prompts/config/types';

/**
 * @description Parses sortBy and sortOrder from URL search params; defaults to updatedAt-desc.
 */
export function parseSortFromSearchParams(searchParams: URLSearchParams): {
  sortBy: PromptsSortBy;
  sortOrder: PromptsSortOrder;
} {
  const by = searchParams.get('sortBy');
  const order = searchParams.get('sortOrder');

  return {
    sortBy: (PROMPTS_SORT_BY as readonly string[]).includes(by ?? '')
      ? (by as PromptsSortBy)
      : 'updatedAt',
    sortOrder: (PROMPTS_SORT_ORDER as readonly string[]).includes(order ?? '')
      ? (order as PromptsSortOrder)
      : 'desc',
  };
}

export const PROMPTS_TYPE_FILTER_OPTIONS = [
  { label: 'Agents', value: CustomPromptType.Agents },
  { label: 'Commands', value: CustomPromptType.Commands },
  { label: 'Prompts', value: CustomPromptType.Prompts },
  { label: 'Rules', value: CustomPromptType.Rules },
  { label: 'Skills', value: CustomPromptType.Skills },
] as const;

const PROMPTS_VALID_TYPES = new Set(
  PROMPTS_TYPE_FILTER_OPTIONS.map((opt) => opt.value),
);

export type PromptTypeFilterValue =
  (typeof PROMPTS_TYPE_FILTER_OPTIONS)[number]['value'];

export const TYPE_OPTIONS: readonly string[] = PROMPTS_TYPE_FILTER_OPTIONS.map(
  (opt) => opt.value,
);

/**
 * @description Returns multiple prompt types from the URL (getAll("type") and comma-separated).
 * Returns empty array when none provided (show all types).
 */
export function parseTypesFromSearchParams(
  searchParams: URLSearchParams,
): string[] {
  const raw = searchParams
    .getAll('type')
    .flatMap((s) => s.split(','))
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  return raw.filter((s) => PROMPTS_VALID_TYPES.has(s as PromptTypeFilterValue));
}
