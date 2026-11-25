import type { PromptTypesValue } from '@openthrottle/react-router-editor';
import { PROMPT_TYPE_VALUES } from '@openthrottle/react-router-editor';

import { CustomPromptType } from '~/__generated__/graphql';

/** Narrow a raw string to a create-form {@link PromptTypesValue}. */
export const isPromptType = (value: string): value is PromptTypesValue => {
  return PROMPT_TYPE_VALUES.some((candidate) => candidate === value);
};

/** Narrow a raw string to a GraphQL {@link CustomPromptType}. */
export const isCustomPromptType = (
  value: string,
): value is CustomPromptType => {
  return Object.values(CustomPromptType).some((type) => type === value);
};
