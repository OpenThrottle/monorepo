import {
  PROMPTS_SORT_BY,
  PROMPTS_SORT_ORDER,
  PromptsSortBy,
  PromptsSortOrder,
} from '~/routing/prompts/config/types';

export const isPromptsSortBy = (value: string): value is PromptsSortBy =>
  PROMPTS_SORT_BY.some((candidate) => candidate === value);

export const isPromptsSortOrder = (value: string): value is PromptsSortOrder =>
  PROMPTS_SORT_ORDER.some((candidate) => candidate === value);
