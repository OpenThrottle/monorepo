/**
 * @description Maps the rule loaders' prompt query results to the options the
 * attach-prompt picker renders. Client-safe on purpose: it must not import
 * `@openthrottle/openthrottle-skills`, whose main entry pulls `node:fs`.
 */

export type RulePromptOwner = 'system' | 'yours';

export type RulePromptType = 'personas' | 'prompts';

export interface RuleFormPromptOption {
  readonly id: string;
  readonly owner: RulePromptOwner;
  readonly promptType: RulePromptType;
  readonly title: string;
}

export interface RulePromptSource {
  readonly id: string;
  readonly title: string;
  readonly userId?: string | null;
}

/** `userId == null` is a system prompt; anything else is the caller's own. */
export const resolveRulePromptOwner = (
  userId: string | null | undefined,
): RulePromptOwner => {
  return userId == null ? 'system' : 'yours';
};

/** Merges the persona and prompt lists into one title-sorted option list. */
export const buildRulePromptOptions = (
  personas: readonly RulePromptSource[],
  prompts: readonly RulePromptSource[],
): RuleFormPromptOption[] => {
  const toOptions = (
    sources: readonly RulePromptSource[],
    promptType: RulePromptType,
  ): RuleFormPromptOption[] => {
    return sources.map((source) => {
      return {
        id: source.id,
        owner: resolveRulePromptOwner(source.userId),
        promptType,
        title: source.title,
      };
    });
  };

  return [
    ...toOptions(personas, 'personas'),
    ...toOptions(prompts, 'prompts'),
  ].sort((left, right) => left.title.localeCompare(right.title));
};
