import { CustomPromptType } from '~/__generated__/graphql';
import type {
  PromptsSortBy,
  PromptsSortOrder,
} from '~/routing/prompts/config/types';
import {
  PROMPTS_SORT_BY,
  PROMPTS_SORT_ORDER,
} from '~/routing/prompts/config/types';

const isPromptsSortBy = (value: string): value is PromptsSortBy =>
  PROMPTS_SORT_BY.some((candidate) => candidate === value);

const isPromptsSortOrder = (value: string): value is PromptsSortOrder =>
  PROMPTS_SORT_ORDER.some((candidate) => candidate === value);

/**
 * @description Parses sortBy and sortOrder from URL search params; defaults to updatedAt-desc.
 */
export function parsePromptsSortFromSearchParams(
  searchParams: URLSearchParams,
): {
  sortBy: PromptsSortBy;
  sortOrder: PromptsSortOrder;
} {
  const by = searchParams.get('sortBy') ?? '';
  const order = searchParams.get('sortOrder') ?? '';

  return {
    sortBy: isPromptsSortBy(by) ? by : 'updatedAt',
    sortOrder: isPromptsSortOrder(order) ? order : 'desc',
  };
}

export const PROMPTS_TYPE_FILTER_OPTIONS: readonly {
  label: string;
  value: CustomPromptType;
}[] = [
  { label: 'Agents', value: CustomPromptType.Agents },
  { label: 'Commands', value: CustomPromptType.Commands },
  { label: 'Prompts', value: CustomPromptType.Prompts },
  { label: 'Rules', value: CustomPromptType.Rules },
  { label: 'Skills', value: CustomPromptType.Skills },
];

export const PROMPTS_VALID_TYPES = new Set<string>(
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
export function parsePromptsTypesFromSearchParams(
  searchParams: URLSearchParams,
): string[] {
  const raw = searchParams
    .getAll('type')
    .flatMap((s) => s.split(','))
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  return raw.filter((s) => PROMPTS_VALID_TYPES.has(s));
}
