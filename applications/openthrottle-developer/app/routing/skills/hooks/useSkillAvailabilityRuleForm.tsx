import * as React from 'react';
import { useFetcher } from 'react-router';
import { getActionError } from '@openthrottle/react-router-utils';
import { SKILL_AVAILABILITY_COPY } from '~/routing/skills/data/data.copy';
import {
  environmentValueToChoice,
  findInvalidSlugs,
  parseSlugInput,
  ruleHasAnyEntry,
  SKILL_AVAILABILITY_EMPTY_RULE,
  isSkillAvailabilityEnvironmentChoice,
  type SkillAvailabilityEnvironmentChoice,
  type SkillAvailabilityRuleValue,
} from '~/routing/skills/utils/skill-availability';

const COPY = SKILL_AVAILABILITY_COPY.rules;

export interface SkillAvailabilityRuleFormOptions {
  /** Existing rule to edit; omitted for the blank add form. */
  rule?: SkillAvailabilityRuleValue;
  /** Workspace vocabulary that constrains the tag pickers. */
  vocabulary: readonly string[];
}

export interface UseSkillAvailabilityRuleFormResult {
  clientError: string | undefined;
  environmentChoice: SkillAvailabilityEnvironmentChoice;
  fetcher: ReturnType<typeof useFetcher>;
  handleEnvironmentChange: (value: string) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  serverError: string | undefined;
  setSlugAllowRaw: React.Dispatch<React.SetStateAction<string>>;
  setSlugDenyRaw: React.Dispatch<React.SetStateAction<string>>;
  setTagAllow: React.Dispatch<React.SetStateAction<string[]>>;
  setTagDeny: React.Dispatch<React.SetStateAction<string[]>>;
  slugAllow: string[];
  slugAllowRaw: string;
  slugDeny: string[];
  slugDenyRaw: string;
  tagAllow: string[];
  tagDeny: string[];
  tagOptions: { label: string; value: string }[];
}

/**
 * @description Field state, client-side validation, and submit wiring for a
 * single skill-availability rule editor. Extracted from
 * SkillAvailabilityRuleForm per component-primitive-shape R6/R7.
 */
export const useSkillAvailabilityRuleForm = (
  options: SkillAvailabilityRuleFormOptions,
): UseSkillAvailabilityRuleFormResult => {
  const { rule, vocabulary } = options;
  const seed = rule ?? SKILL_AVAILABILITY_EMPTY_RULE;

  // Hooks
  const fetcher = useFetcher();
  const [environmentChoice, setEnvironmentChoice] =
    React.useState<SkillAvailabilityEnvironmentChoice>(
      environmentValueToChoice(seed.environment),
    );
  const [tagAllow, setTagAllow] = React.useState<string[]>([...seed.tagAllow]);
  const [tagDeny, setTagDeny] = React.useState<string[]>([...seed.tagDeny]);
  const [slugAllowRaw, setSlugAllowRaw] = React.useState(
    seed.slugAllow.join(', '),
  );
  const [slugDenyRaw, setSlugDenyRaw] = React.useState(
    seed.slugDeny.join(', '),
  );
  const [clientError, setClientError] = React.useState<string | undefined>(
    undefined,
  );

  // Setup
  const slugAllow = React.useMemo(
    () => parseSlugInput(slugAllowRaw),
    [slugAllowRaw],
  );
  const slugDeny = React.useMemo(
    () => parseSlugInput(slugDenyRaw),
    [slugDenyRaw],
  );
  const tagOptions = vocabulary.map((tag) => ({ label: tag, value: tag }));
  const isSubmitting = fetcher.state !== 'idle';
  const serverError = getActionError(fetcher.data);

  // Handlers
  const handleEnvironmentChange = (value: string): void => {
    if (isSkillAvailabilityEnvironmentChoice(value)) {
      setEnvironmentChoice(value);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    const invalidSlugs = findInvalidSlugs([...slugAllow, ...slugDeny]);
    if (invalidSlugs.length > 0) {
      event.preventDefault();
      setClientError(`${COPY.invalidSlugError} ${invalidSlugs.join(', ')}`);
      return;
    }
    if (!ruleHasAnyEntry({ slugAllow, slugDeny, tagAllow, tagDeny })) {
      event.preventDefault();
      setClientError(COPY.emptySlugError);
      return;
    }
    setClientError(undefined);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    clientError,
    environmentChoice,
    fetcher,
    handleEnvironmentChange,
    handleSubmit,
    isSubmitting,
    serverError,
    setSlugAllowRaw,
    setSlugDenyRaw,
    setTagAllow,
    setTagDeny,
    slugAllow,
    slugAllowRaw,
    slugDeny,
    slugDenyRaw,
    tagAllow,
    tagDeny,
    tagOptions,
  };
};
