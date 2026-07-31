import * as React from 'react';
import { ANY } from '~/routing/rules/data/rule-form-options';
import {
  parsePayloadField,
  splitList,
} from '~/routing/rules/utils/rule-form-payload';
import type { TagActionRuleRowData } from '~/routing/rules/components/RulesTable';

export interface UseRuleFormOptions {
  /** Existing rule when editing; null/undefined when creating. */
  initialRule?: TagActionRuleRowData | null;
}

/**
 * @description All form state behind RuleForm: the field values hydrated from
 * an optional initial rule, the assembled typed action payload, the
 * submit-disabled derivation, and the tag-chip toggle handler. Extracted from
 * RuleForm per component-primitive-shape R7 (the spec's worked example) so the
 * component stays UI-focused and the form logic is testable on its own.
 */
export const useRuleForm = (options: UseRuleFormOptions) => {
  const { initialRule } = options;

  // Hooks
  const [title, setTitle] = React.useState(initialRule?.title ?? '');
  const [actionType, setActionType] = React.useState(
    initialRule?.actionType ?? 'inject-task',
  );
  const [tagAll, setTagAll] = React.useState<string[]>(
    initialRule?.tagAll ?? [],
  );
  const [status, setStatus] = React.useState(initialRule?.status ?? ANY);
  const [environment, setEnvironment] = React.useState(
    initialRule?.environment ?? ANY,
  );
  const [skillSlug, setSkillSlug] = React.useState(
    initialRule != null
      ? parsePayloadField(initialRule.actionPayloadJson, 'skillSlug')
      : '',
  );
  const [placement, setPlacement] = React.useState(
    initialRule != null
      ? parsePayloadField(initialRule.actionPayloadJson, 'placement') || 'first'
      : 'first',
  );
  const [titleTemplate, setTitleTemplate] = React.useState(
    initialRule != null
      ? parsePayloadField(initialRule.actionPayloadJson, 'titleTemplate')
      : '',
  );
  const [tagAllow, setTagAllow] = React.useState(
    initialRule != null
      ? parsePayloadField(initialRule.actionPayloadJson, 'tagAllow')
      : '',
  );
  const [tagDeny, setTagDeny] = React.useState(
    initialRule != null
      ? parsePayloadField(initialRule.actionPayloadJson, 'tagDeny')
      : '',
  );
  const [slugAllow, setSlugAllow] = React.useState(
    initialRule != null
      ? parsePayloadField(initialRule.actionPayloadJson, 'slugAllow')
      : '',
  );
  const [slugDeny, setSlugDeny] = React.useState(
    initialRule != null
      ? parsePayloadField(initialRule.actionPayloadJson, 'slugDeny')
      : '',
  );

  // Setup
  const isEdit = initialRule != null;

  // The typed payload is assembled client-side and forwarded to the route
  // action as a single hidden JSON field, preserving the inject-task vs
  // availability-exception shapes the server Zod-validates.
  const actionPayloadJson =
    actionType === 'inject-task'
      ? JSON.stringify({
          placement,
          skillSlug,
          ...(titleTemplate !== '' ? { titleTemplate } : {}),
        })
      : JSON.stringify({
          slugAllow: splitList(slugAllow),
          slugDeny: splitList(slugDeny),
          tagAllow: splitList(tagAllow),
          tagDeny: splitList(tagDeny),
        });

  const submitDisabled =
    title.trim() === '' || (actionType === 'inject-task' && skillSlug === '');

  // Handlers
  const handleToggleTag = (tag: string): void => {
    setTagAll((current) =>
      current.includes(tag)
        ? current.filter((entry) => entry !== tag)
        : [...current, tag],
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    actionPayloadJson,
    actionType,
    environment,
    handleToggleTag,
    isEdit,
    placement,
    setActionType,
    setEnvironment,
    setPlacement,
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
