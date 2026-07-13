import * as React from 'react';
import { Button, Card } from '@openthrottle/react-router-shadcn';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import type { TagActionRuleRowData } from '~/routing/rules/components/RulesTable';

export interface RuleFormVocabularyOption {
  dimension: string;
  tag: string;
}

export interface RuleFormValue {
  actionPayloadJson: string;
  actionType: string;
  enabled: boolean;
  environment: string | null;
  id: string | null;
  status: string | null;
  tagAll: string[];
}

export interface RuleFormProps {
  // className?: string;
  initialRule: TagActionRuleRowData | null;
  onCancel: () => void;
  onSubmit: (value: RuleFormValue) => void;
  pending?: boolean;
  skillSlugs: string[];
  vocabulary: RuleFormVocabularyOption[];
}

const PLAN_STATUSES = [
  'BACKLOG',
  'BLOCKED',
  'CANCELED',
  'COMPLETED',
  'IN_PROGRESS',
  'PENDING',
  'QUEUED',
  'SKIPPED',
];
const ENVIRONMENTS = ['ci', 'interactive', 'ralph'];

const parsePayloadField = (json: string, field: string): string => {
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) return '';
    const record: Record<string, unknown> = { ...parsed };
    const value = record[field];
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ');
    return '';
  } catch {
    return '';
  }
};

const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const RuleForm = (props: RuleFormProps): React.ReactElement => {
  const {
    initialRule,
    onCancel,
    onSubmit,
    pending = false,
    skillSlugs,
    vocabulary,
  } = props;

  // Hooks
  const [actionType, setActionType] = React.useState(
    initialRule?.actionType ?? 'inject-task',
  );
  const [tagAll, setTagAll] = React.useState<string[]>(
    initialRule?.tagAll ?? [],
  );
  const [status, setStatus] = React.useState(initialRule?.status ?? '');
  const [environment, setEnvironment] = React.useState(
    initialRule?.environment ?? '',
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
  const domainOptions = vocabulary.filter(
    (option) => option.dimension === 'domain',
  );
  const phaseOptions = vocabulary.filter(
    (option) => option.dimension === 'phase',
  );

  // Handlers
  const handleToggleTag = (tag: string): void => {
    setTagAll((current) =>
      current.includes(tag)
        ? current.filter((entry) => entry !== tag)
        : [...current, tag],
    );
  };

  const handleSubmit = (): void => {
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

    onSubmit({
      actionPayloadJson,
      actionType,
      enabled: initialRule?.enabled ?? true,
      environment: environment === '' ? null : environment,
      id: initialRule?.id ?? null,
      status: status === '' ? null : status,
      tagAll,
    });
  };

  // Markup
  const renderTagOption = (
    option: RuleFormVocabularyOption,
  ): React.ReactElement => (
    <label className="flex items-center gap-1 text-xs" key={option.tag}>
      <input
        checked={tagAll.includes(option.tag)}
        onChange={() => handleToggleTag(option.tag)}
        type="checkbox"
      />
      {option.tag}
    </label>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="flex flex-col gap-4 p-4" data-testid="RuleForm">
      <h3 className="text-sm font-semibold">
        {initialRule == null ? RULES_COPY.createTitle : RULES_COPY.editTitle}
      </h3>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium">
          {RULES_COPY.matchLegend}
        </legend>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">Phase tags</span>
          <div className="flex flex-wrap gap-3">
            {phaseOptions.map(renderTagOption)}
          </div>
          <span className="text-muted-foreground text-xs">Domain tags</span>
          <div className="flex flex-wrap gap-3">
            {domainOptions.map(renderTagOption)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs" htmlFor="rule-status">
            Status
          </label>
          <select
            className="border-input bg-background h-7 rounded-md border px-2 text-xs"
            id="rule-status"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">any</option>
            {PLAN_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <label className="text-xs" htmlFor="rule-environment">
            Environment
          </label>
          <select
            className="border-input bg-background h-7 rounded-md border px-2 text-xs"
            id="rule-environment"
            onChange={(event) => setEnvironment(event.target.value)}
            value={environment}
          >
            <option value="">any</option>
            {ENVIRONMENTS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-medium">
          {RULES_COPY.actionLegend}
        </legend>
        <select
          aria-label="Action type"
          className="border-input bg-background h-7 w-fit rounded-md border px-2 text-xs"
          onChange={(event) => setActionType(event.target.value)}
          value={actionType}
        >
          <option value="inject-task">inject-task</option>
          <option value="availability-exception">availability-exception</option>
        </select>

        {actionType === 'inject-task' ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs" htmlFor="rule-skill-slug">
              Skill
            </label>
            <select
              className="border-input bg-background h-7 rounded-md border px-2 text-xs"
              id="rule-skill-slug"
              onChange={(event) => setSkillSlug(event.target.value)}
              value={skillSlug}
            >
              <option value="">Pick a skill…</option>
              {skillSlugs.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </select>
            <label className="text-xs" htmlFor="rule-placement">
              Placement
            </label>
            <select
              className="border-input bg-background h-7 rounded-md border px-2 text-xs"
              id="rule-placement"
              onChange={(event) => setPlacement(event.target.value)}
              value={placement}
            >
              <option value="first">first</option>
              <option value="last">last</option>
            </select>
            <input
              aria-label="Title template"
              className="border-input bg-background h-7 min-w-64 rounded-md border px-2 text-xs"
              onChange={(event) => setTitleTemplate(event.target.value)}
              placeholder={RULES_COPY.titleTemplatePlaceholder}
              value={titleTemplate}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              aria-label="Tag allow list"
              className="border-input bg-background h-7 rounded-md border px-2 text-xs"
              onChange={(event) => setTagAllow(event.target.value)}
              placeholder="tagAllow (comma-separated)"
              value={tagAllow}
            />
            <input
              aria-label="Tag deny list"
              className="border-input bg-background h-7 rounded-md border px-2 text-xs"
              onChange={(event) => setTagDeny(event.target.value)}
              placeholder="tagDeny (comma-separated)"
              value={tagDeny}
            />
            <input
              aria-label="Slug allow list"
              className="border-input bg-background h-7 rounded-md border px-2 text-xs"
              onChange={(event) => setSlugAllow(event.target.value)}
              placeholder="slugAllow (comma-separated)"
              value={slugAllow}
            />
            <input
              aria-label="Slug deny list"
              className="border-input bg-background h-7 rounded-md border px-2 text-xs"
              onChange={(event) => setSlugDeny(event.target.value)}
              placeholder="slugDeny (comma-separated)"
              value={slugDeny}
            />
          </div>
        )}
      </fieldset>

      <div className="flex gap-2">
        <Button
          disabled={
            pending || (actionType === 'inject-task' && skillSlug === '')
          }
          onClick={handleSubmit}
          size="sm"
          type="button"
        >
          {RULES_COPY.saveAction}
        </Button>
        <Button
          disabled={pending}
          onClick={onCancel}
          size="sm"
          type="button"
          variant="outline"
        >
          {RULES_COPY.cancelAction}
        </Button>
      </div>
    </Card>
  );
};
