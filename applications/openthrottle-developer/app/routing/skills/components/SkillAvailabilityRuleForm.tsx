import {
  Button,
  cn,
  Input,
  Label,
  MultiSelect,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { SkillAvailabilityRuleRemoveButton } from '~/routing/skills/components/SkillAvailabilityRuleRemoveButton';
import { SKILL_AVAILABILITY_COPY } from '~/routing/skills/data/data.copy';
import { useSkillAvailabilityRuleForm } from '~/routing/skills/hooks/useSkillAvailabilityRuleForm';
import {
  environmentChoiceToValue,
  serializeList,
  SKILL_AVAILABILITY_ENVIRONMENT_ALL,
  SKILL_AVAILABILITY_ENVIRONMENTS,
  type SkillAvailabilityRuleValue,
} from '~/routing/skills/utils/skill-availability';

const COPY = SKILL_AVAILABILITY_COPY.rules;

export interface SkillAvailabilityRuleFormProps {
  readonly className?: string;
  /** `add` renders a blank create form; `edit` seeds from `rule` and exposes remove. */
  readonly mode: 'add' | 'edit';
  /** Existing rule to edit (required in `edit` mode; ignored in `add`). */
  readonly rule?: SkillAvailabilityRuleValue;
  /** Workspace vocabulary that constrains the tag pickers. */
  readonly vocabulary: readonly string[];
}

/**
 * @description A single per-project rule editor (design rungs 1–2): an environment qualifier, tag
 * allow/deny pickers constrained to the workspace vocabulary, and free-text kebab-case slug
 * allow/deny lists. Validates client-side (kebab-case slugs, no empty rule) before submitting
 * `addRule`/`updateRule`, and surfaces server tag-validation errors (which list the offenders)
 * inline. `edit` mode adds a confirm-gated `removeRule`.
 */
export const SkillAvailabilityRuleForm = (
  props: SkillAvailabilityRuleFormProps,
): React.ReactElement => {
  const { className, mode, rule, vocabulary } = props;

  // Hooks
  const {
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
  } = useSkillAvailabilityRuleForm({ rule, vocabulary });

  // Setup
  const ruleId = rule?.id;
  const isEditingRule = mode === 'edit' && ruleId != null;
  const intent = mode === 'add' ? 'addRule' : 'updateRule';
  const submitLabel = mode === 'add' ? COPY.addLabel : COPY.updateLabel;

  // Handlers
  const renderRemoveButton = (): React.ReactNode => {
    if (mode !== 'edit' || ruleId == null) {
      return null;
    }

    return <SkillAvailabilityRuleRemoveButton ruleId={ruleId} />;
  };

  // Markup
  const ruleIdInput = <input name="ruleId" type="hidden" value={ruleId} />;
  const clientErrorMessage = (
    <p className="text-destructive text-sm" role="alert">
      {clientError}
    </p>
  );
  const serverErrorMessage = (
    <p className="text-destructive text-sm" role="alert">
      {serverError}
    </p>
  );
  const removeButton = renderRemoveButton();

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-col gap-3 rounded-lg border p-4', className)}
      data-testid="SkillAvailabilityRuleForm"
    >
      <fetcher.Form
        className="flex flex-col gap-3"
        method="post"
        onSubmit={handleSubmit}
      >
        <input name="intent" type="hidden" value={intent} />
        {isEditingRule ? ruleIdInput : null}
        <input
          name="environment"
          type="hidden"
          value={environmentChoiceToValue(environmentChoice) ?? ''}
        />
        <input name="tagAllow" type="hidden" value={serializeList(tagAllow)} />
        <input name="tagDeny" type="hidden" value={serializeList(tagDeny)} />
        <input
          name="slugAllow"
          type="hidden"
          value={serializeList(slugAllow)}
        />
        <input name="slugDeny" type="hidden" value={serializeList(slugDeny)} />

        <div className="flex flex-col gap-1">
          <Label>{COPY.environmentLabel}</Label>
          <ToggleGroup
            aria-label={COPY.environmentLabel}
            onValueChange={handleEnvironmentChange}
            type="single"
            value={environmentChoice}
          >
            <ToggleGroupItem value={SKILL_AVAILABILITY_ENVIRONMENT_ALL}>
              {COPY.environmentAllLabel}
            </ToggleGroupItem>
            {SKILL_AVAILABILITY_ENVIRONMENTS.map((environment) => (
              <ToggleGroupItem key={environment} value={environment}>
                {environment}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label>{COPY.tagAllowLabel}</Label>
            <MultiSelect
              onChange={setTagAllow}
              options={tagOptions}
              placeholder="Select allow tags…"
              value={tagAllow}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>{COPY.tagDenyLabel}</Label>
            <MultiSelect
              onChange={setTagDeny}
              options={tagOptions}
              placeholder="Select deny tags…"
              value={tagDeny}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{COPY.tagHelp}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`slug-allow-${rule?.id ?? 'new'}`}>
              {COPY.slugAllowLabel}
            </Label>
            <Input
              id={`slug-allow-${rule?.id ?? 'new'}`}
              onChange={(event) => setSlugAllowRaw(event.target.value)}
              placeholder={COPY.slugAllowPlaceholder}
              value={slugAllowRaw}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`slug-deny-${rule?.id ?? 'new'}`}>
              {COPY.slugDenyLabel}
            </Label>
            <Input
              id={`slug-deny-${rule?.id ?? 'new'}`}
              onChange={(event) => setSlugDenyRaw(event.target.value)}
              placeholder={COPY.slugDenyPlaceholder}
              value={slugDenyRaw}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{COPY.slugHelp}</p>

        {clientError ? clientErrorMessage : null}
        {serverError ? serverErrorMessage : null}

        <div>
          <Button disabled={isSubmitting} type="submit">
            {submitLabel}
          </Button>
        </div>
      </fetcher.Form>

      {removeButton}
    </div>
  );
};
