/**
 * @description Type filter options for the prompts list (PromptToolbar).
 * Aligns with CustomPromptType enum from GraphQL schema.
 */
import { CustomPromptType } from '~/__generated__/graphql';
import type {
  PromptsSortBy,
  PromptsSortOrder,
} from '~/routing/prompts/config/types';

export const PROMPTS_BASE_PATH = '/prompts';
export const PROMPTS_DEFAULT_TYPE: CustomPromptType = CustomPromptType.Agents;
export const PROMPTS_DEFAULT_CONTENT = `# New Prompt

Add your prompt content here...
`;

export const PROMPTS_SORT_OPTIONS: readonly {
  readonly label: string;
  readonly value: `${PromptsSortBy}-${PromptsSortOrder}`;
}[] = [
  { label: 'Recently updated', value: 'updatedAt-desc' },
  { label: 'Least recently updated', value: 'updatedAt-asc' },
  { label: 'Newest first', value: 'createdAt-desc' },
  { label: 'Oldest first', value: 'createdAt-asc' },
  { label: 'Title A-Z', value: 'title-asc' },
  { label: 'Title Z-A', value: 'title-desc' },
];
