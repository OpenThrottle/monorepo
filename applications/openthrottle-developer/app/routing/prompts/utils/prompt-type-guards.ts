import { PROMPT_TYPE_VALUES } from '@openthrottle/react-router-editor';
import type { PromptType } from '@openthrottle/react-router-editor';
import { CustomPromptType } from '~/__generated__/graphql';

/** Narrow a raw string to a create-form {@link PromptType}. */
export const isPromptType = (value: string): value is PromptType =>
  PROMPT_TYPE_VALUES.some((candidate) => candidate === value);

/** Narrow a raw string to a GraphQL {@link CustomPromptType}. */
export const isCustomPromptType = (value: string): value is CustomPromptType =>
  Object.values(CustomPromptType).some((type) => type === value);
