import * as React from 'react';
import clsx from 'clsx';
import { useFetcher } from 'react-router';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  Label,
  MultiSelect,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { SKILL_AVAILABILITY_COPY } from '~/routing/skills/data/data.copy';
import {
  environmentChoiceToValue,
  environmentValueToChoice,
  findInvalidSlugs,
  isSkillAvailabilityEnvironment,
  parseSlugInput,
  ruleHasAnyEntry,
  serializeList,
  SKILL_AVAILABILITY_ENVIRONMENT_ALL,
  SKILL_AVAILABILITY_ENVIRONMENTS,
  type SkillAvailabilityEnvironmentChoice,
  type SkillAvailabilityRuleValue,
} from '~/routing/skills/utils/skill-availability';

const COPY = SKILL_AVAILABILITY_COPY.rules;

const EMPTY_RULE: SkillAvailabilityRuleValue = {
  environment: null,
  slugAllow: [],
  slugDeny: [],
  tagAllow: [],
  tagDeny: [],
};

/** Narrow a ToggleGroup value to a known environment choice (the `all` sentinel or a real env). */
function isEnvironmentChoice(
  value: string,
): value is SkillAvailabilityEnvironmentChoice {
  return (
    value === SKILL_AVAILABILITY_ENVIRONMENT_ALL ||
    isSkillAvailabilityEnvironment(value)
  );
}

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
  const seed = rule ?? EMPTY_RULE;

  // Hooks
  const fetcher = useFetcher();
  const removeFetcher = useFetcher();
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
  const serverError =
    fetcher.data != null &&
    typeof fetcher.data === 'object' &&
    'error' in fetcher.data &&
    typeof fetcher.data.error === 'string'
      ? fetcher.data.error
      : undefined;

  // Handlers
  const handleEnvironmentChange = (value: string): void => {
    if (isEnvironmentChoice(value)) {
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

  return (
    <div
      className={clsx('flex flex-col gap-3 rounded-lg border p-4', className)}
      data-testid="SkillAvailabilityRuleForm"
    >
      <fetcher.Form
        className="flex flex-col gap-3"
        method="post"
        onSubmit={handleSubmit}
      >
        <input
          name="intent"
          type="hidden"
          value={mode === 'add' ? 'addRule' : 'updateRule'}
        />
        {mode === 'edit' && rule?.id != null ? (
          <input name="ruleId" type="hidden" value={rule.id} />
        ) : null}
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

        {clientError ? (
          <p className="text-destructive text-sm" role="alert">
            {clientError}
          </p>
        ) : null}
        {serverError ? (
          <p className="text-destructive text-sm" role="alert">
            {serverError}
          </p>
        ) : null}

        <div>
          <Button disabled={isSubmitting} type="submit">
            {mode === 'add' ? COPY.addLabel : COPY.updateLabel}
          </Button>
        </div>
      </fetcher.Form>

      {mode === 'edit' && rule?.id != null ? (
        <AlertDialog>
          <AlertDialogTrigger asChild={true}>
            <Button type="button" variant="outline">
              {COPY.removeLabel}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{COPY.removeLabel}</AlertDialogTitle>
              <AlertDialogDescription>
                {COPY.removeLabel} — this cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <removeFetcher.Form method="post">
              <input name="intent" type="hidden" value="removeRule" />
              <input name="ruleId" type="hidden" value={rule.id} />
              <AlertDialogFooter>
                <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                <Button type="submit" variant="destructive">
                  {COPY.removeLabel}
                </Button>
              </AlertDialogFooter>
            </removeFetcher.Form>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
};
