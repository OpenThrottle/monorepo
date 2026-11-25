import * as React from 'react';

import type { TagActionRuleRowFragment } from '~/__generated__/graphql';
import {
  ANY,
  ATTACH_PROMPT_ACTION_TYPE,
  DEFAULT_ATTACH_PROMPT_PLACEMENT,
  DEFAULT_ATTACH_PROMPT_TYPE,
} from '~/routing/rules/data/rule-form-options';
import type { RuleFormAttachPromptState } from '~/routing/rules/types';
import {
  buildAttachPromptPayloadJson,
  parsePayloadField,
  splitList,
} from '~/routing/rules/utils/rule-form-payload';

export interface UseRuleFormOptions {
  /** Existing rule when editing; null/undefined when creating. */
  initialRule?: TagActionRuleRowFragment | null;
}

export interface UseRuleFormResult {
  readonly actionPayloadJson: string;
  readonly actionType: string;
  readonly attachPrompt: RuleFormAttachPromptState;
  readonly environment: string;
  readonly handleToggleTag: (tag: string) => void;
  readonly isEdit: boolean;
  readonly placement: string;
  readonly projectId: string;
  readonly repositoryId: string;
  readonly setActionType: React.Dispatch<React.SetStateAction<string>>;
  readonly setEnvironment: React.Dispatch<React.SetStateAction<string>>;
  readonly setPlacement: React.Dispatch<React.SetStateAction<string>>;
  readonly setProjectId: React.Dispatch<React.SetStateAction<string>>;
  readonly setRepositoryId: React.Dispatch<React.SetStateAction<string>>;
  readonly setSkillSlug: React.Dispatch<React.SetStateAction<string>>;
  readonly setSlugAllow: React.Dispatch<React.SetStateAction<string>>;
  readonly setSlugDeny: React.Dispatch<React.SetStateAction<string>>;
  readonly setStatus: React.Dispatch<React.SetStateAction<string>>;
  readonly setTagAllow: React.Dispatch<React.SetStateAction<string>>;
  readonly setTagDeny: React.Dispatch<React.SetStateAction<string>>;
  readonly setTitle: React.Dispatch<React.SetStateAction<string>>;
  readonly setTitleTemplate: React.Dispatch<React.SetStateAction<string>>;
  readonly skillSlug: string;
  readonly slugAllow: string;
  readonly slugDeny: string;
  readonly status: string;
  readonly submitDisabled: boolean;
  readonly tagAll: string[];
  readonly tagAllow: string;
  readonly tagDeny: string;
  readonly title: string;
  readonly titleTemplate: string;
}

/**
 * @description All form state behind RuleForm: the field values hydrated from
 * an optional initial rule, the assembled typed action payload, the
 * submit-disabled derivation, and the tag-chip toggle handler. Extracted from
 * RuleForm per component-primitive-shape R7 (the spec's worked example) so the
 * component stays UI-focused and the form logic is testable on its own.
 */
export const useRuleForm = (options: UseRuleFormOptions): UseRuleFormResult => {
  const { initialRule } = options;

  // Hooks
  const readInitialPayloadField = (field: string): string => {
    if (initialRule == null) {
      return '';
    }

    return parsePayloadField(initialRule.actionPayloadJson, field);
  };
  // `placement` means first/last for inject-task and start/end for
  // attach-prompt, so a field is only hydrated for the rule's own action type.
  const readInitialAttachField = (field: string): string => {
    if (initialRule?.actionType !== ATTACH_PROMPT_ACTION_TYPE) {
      return '';
    }

    return readInitialPayloadField(field);
  };
  const [title, setTitle] = React.useState(initialRule?.title ?? '');
  const [actionType, setActionType] = React.useState(
    initialRule?.actionType ?? 'inject-task',
  );
  const [tagAll, setTagAll] = React.useState<string[]>(
    initialRule?.tagAll ?? [],
  );
  const [projectId, setProjectId] = React.useState(
    initialRule?.projectId ?? ANY,
  );
  const [repositoryId, setRepositoryId] = React.useState(
    initialRule?.repositoryId ?? ANY,
  );
  const [status, setStatus] = React.useState(initialRule?.status ?? ANY);
  const [environment, setEnvironment] = React.useState(
    initialRule?.environment ?? ANY,
  );
  const [skillSlug, setSkillSlug] = React.useState(
    readInitialPayloadField('skillSlug'),
  );
  const [placement, setPlacement] = React.useState(
    (initialRule?.actionType === ATTACH_PROMPT_ACTION_TYPE
      ? ''
      : readInitialPayloadField('placement')) || 'first',
  );
  const [titleTemplate, setTitleTemplate] = React.useState(
    readInitialPayloadField('titleTemplate'),
  );
  const [promptId, setPromptId] = React.useState(
    readInitialAttachField('promptId'),
  );
  const [promptType, setPromptType] = React.useState(
    readInitialAttachField('promptType') || DEFAULT_ATTACH_PROMPT_TYPE,
  );
  const [attachPlacement, setAttachPlacement] = React.useState(
    readInitialAttachField('placement') || DEFAULT_ATTACH_PROMPT_PLACEMENT,
  );
  const [tagAllow, setTagAllow] = React.useState(
    readInitialPayloadField('tagAllow'),
  );
  const [tagDeny, setTagDeny] = React.useState(
    readInitialPayloadField('tagDeny'),
  );
  const [slugAllow, setSlugAllow] = React.useState(
    readInitialPayloadField('slugAllow'),
  );
  const [slugDeny, setSlugDeny] = React.useState(
    readInitialPayloadField('slugDeny'),
  );

  // Setup
  const isEdit = initialRule != null;
  const isInjectTask = actionType === 'inject-task';
  const isAttachPrompt = actionType === ATTACH_PROMPT_ACTION_TYPE;
  const attachFilePath = readInitialAttachField('filePath');

  // The typed payload is assembled client-side and forwarded to the route
  // action as a single hidden JSON field, preserving the inject-task vs
  // availability-exception shapes the server Zod-validates.
  const buildActionPayloadJson = (): string => {
    if (isInjectTask) {
      const hasTitleTemplate = titleTemplate !== '';

      return JSON.stringify({
        placement,
        skillSlug,
        ...(hasTitleTemplate ? { titleTemplate } : {}),
      });
    }

    if (isAttachPrompt) {
      return buildAttachPromptPayloadJson({
        filePath: attachFilePath,
        placement: attachPlacement,
        promptId,
        promptType,
      });
    }

    return JSON.stringify({
      slugAllow: splitList(slugAllow),
      slugDeny: splitList(slugDeny),
      tagAllow: splitList(tagAllow),
      tagDeny: splitList(tagDeny),
    });
  };
  const actionPayloadJson = buildActionPayloadJson();

  const hasPromptReference = promptId !== '' || attachFilePath !== '';
  const submitDisabled =
    title.trim() === '' ||
    (isInjectTask && skillSlug === '') ||
    (isAttachPrompt && !hasPromptReference);
  const handlePromptChange = (
    nextPromptId: string,
    nextPromptType: string,
  ): void => {
    setPromptId(nextPromptId);
    setPromptType(nextPromptType);
  };
  const attachPrompt: RuleFormAttachPromptState = {
    filePath: attachFilePath,
    onPlacementChange: setAttachPlacement,
    onPromptChange: handlePromptChange,
    placement: attachPlacement,
    promptId,
  };

  // Handlers
  const handleToggleTag = (tag: string): void => {
    setTagAll((current) => {
      if (current.includes(tag)) {
        return current.filter((entry) => entry !== tag);
      }

      return [...current, tag];
    });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    actionPayloadJson,
    actionType,
    attachPrompt,
    environment,
    handleToggleTag,
    isEdit,
    placement,
    projectId,
    repositoryId,
    setActionType,
    setEnvironment,
    setPlacement,
    setProjectId,
    setRepositoryId,
    setSkillSlug,
    setSlugAllow,
    setSlugDeny,
    setStatus,
    setTagAllow,
    setTagDeny,
    setTitle,
    setTitleTemplate,
    skillSlug,
    slugAllow,
    slugDeny,
    status,
    submitDisabled,
    tagAll,
    tagAllow,
    tagDeny,
    title,
    titleTemplate,
  };
};
