import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { Form, Link } from 'react-router';
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
  title: string;
}

export interface RuleFormProps {
  actionData?: { error?: string } | null;
  initialRule?: TagActionRuleRowData | null;
  skillSlugs: string[];
  vocabulary: RuleFormVocabularyOption[];
}

const ANY = 'any';
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
  const { actionData, initialRule, skillSlugs, vocabulary } = props;

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
  const error = actionData?.error;
  const domainOptions = vocabulary.filter(
    (option) => option.dimension === 'domain',
  );
  const phaseOptions = vocabulary.filter(
    (option) => option.dimension === 'phase',
  );

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
  const renderTagChip = (
    option: RuleFormVocabularyOption,
  ): React.ReactElement => {
    const selected = tagAll.includes(option.tag);
    return (
      <Button
        aria-pressed={selected}
        key={option.tag}
        onClick={() => handleToggleTag(option.tag)}
        size="sm"
        type="button"
        variant={selected ? 'default' : 'outline'}
      >
        {option.tag}
      </Button>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="w-full max-w-2xl gap-8" data-testid="RuleForm">
      <CardHeader>
        <CardTitle>
          {isEdit ? RULES_COPY.editTitle : RULES_COPY.createTitle}
        </CardTitle>
        <CardDescription>{RULES_COPY.formDescription}</CardDescription>
      </CardHeader>

      <Form method="post">
        <CardContent className="space-y-8">
          {isEdit ? (
            <input name="id" type="hidden" value={initialRule.id} />
          ) : null}
          <input
            name="enabled"
            type="hidden"
            value={String(initialRule?.enabled ?? true)}
          />
          <input name="actionType" type="hidden" value={actionType} />
          <input
            name="actionPayloadJson"
            type="hidden"
            value={actionPayloadJson}
          />
          <input
            name="status"
            type="hidden"
            value={status === ANY ? '' : status}
          />
          <input
            name="environment"
            type="hidden"
            value={environment === ANY ? '' : environment}
          />
          {tagAll.map((tag) => (
            <input key={tag} name="tagAll" type="hidden" value={tag} />
          ))}

          {/* Identity */}
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">
                {RULES_COPY.identityLegend}
              </h3>
              <p className="text-muted-foreground text-xs">
                {RULES_COPY.identityDescription}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rule-title">{RULES_COPY.titleLabel}</Label>
              <Input
                id="rule-title"
                name="title"
                onChange={(event) => setTitle(event.target.value)}
                placeholder={RULES_COPY.titlePlaceholder}
                required={true}
                value={title}
              />
            </div>
          </section>

          {/* Match */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">
                {RULES_COPY.matchLegend}
              </h3>
              <p className="text-muted-foreground text-xs">
                {RULES_COPY.matchDescription}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>{RULES_COPY.phaseTagsLabel}</Label>
              <div className="flex flex-wrap gap-2">
                {phaseOptions.map(renderTagChip)}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{RULES_COPY.domainTagsLabel}</Label>
              <div className="flex flex-wrap gap-2">
                {domainOptions.map(renderTagChip)}
              </div>
            </div>

            {tagAll.length === 0 ? (
              <p className="text-muted-foreground text-xs italic">
                {RULES_COPY.noTagsHint}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rule-status">{RULES_COPY.statusLabel}</Label>
                <Select onValueChange={setStatus} value={status}>
                  <SelectTrigger
                    aria-label={RULES_COPY.statusLabel}
                    id="rule-status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>{RULES_COPY.anyOption}</SelectItem>
                    {PLAN_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rule-environment">
                  {RULES_COPY.environmentLabel}
                </Label>
                <Select onValueChange={setEnvironment} value={environment}>
                  <SelectTrigger
                    aria-label={RULES_COPY.environmentLabel}
                    id="rule-environment"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY}>{RULES_COPY.anyOption}</SelectItem>
                    {ENVIRONMENTS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Action */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">
                {RULES_COPY.actionLegend}
              </h3>
              <p className="text-muted-foreground text-xs">
                {RULES_COPY.actionDescription}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rule-action-type">
                {RULES_COPY.actionTypeLabel}
              </Label>
              <Select onValueChange={setActionType} value={actionType}>
                <SelectTrigger
                  aria-label={RULES_COPY.actionTypeLabel}
                  className="w-fit"
                  id="rule-action-type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inject-task">
                    {RULES_COPY.injectTaskOption}
                  </SelectItem>
                  <SelectItem value="availability-exception">
                    {RULES_COPY.availabilityExceptionOption}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {actionType === 'inject-task' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rule-skill-slug">
                    {RULES_COPY.skillLabel}
                  </Label>
                  <Select onValueChange={setSkillSlug} value={skillSlug}>
                    <SelectTrigger
                      aria-label={RULES_COPY.skillLabel}
                      id="rule-skill-slug"
                    >
                      <SelectValue placeholder={RULES_COPY.skillPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {skillSlugs.map((slug) => (
                        <SelectItem key={slug} value={slug}>
                          {slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rule-placement">
                    {RULES_COPY.placementLabel}
                  </Label>
                  <Select onValueChange={setPlacement} value={placement}>
                    <SelectTrigger
                      aria-label={RULES_COPY.placementLabel}
                      id="rule-placement"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">first</SelectItem>
                      <SelectItem value="last">last</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="rule-title-template">Title template</Label>
                  <Input
                    aria-label="Title template"
                    id="rule-title-template"
                    onChange={(event) => setTitleTemplate(event.target.value)}
                    placeholder={RULES_COPY.titleTemplatePlaceholder}
                    value={titleTemplate}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  aria-label="Tag allow list"
                  onChange={(event) => setTagAllow(event.target.value)}
                  placeholder={RULES_COPY.tagAllowPlaceholder}
                  value={tagAllow}
                />
                <Input
                  aria-label="Tag deny list"
                  onChange={(event) => setTagDeny(event.target.value)}
                  placeholder={RULES_COPY.tagDenyPlaceholder}
                  value={tagDeny}
                />
                <Input
                  aria-label="Slug allow list"
                  onChange={(event) => setSlugAllow(event.target.value)}
                  placeholder={RULES_COPY.slugAllowPlaceholder}
                  value={slugAllow}
                />
                <Input
                  aria-label="Slug deny list"
                  onChange={(event) => setSlugDeny(event.target.value)}
                  placeholder={RULES_COPY.slugDenyPlaceholder}
                  value={slugDeny}
                />
              </div>
            )}
          </section>

          {error != null ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="justify-end gap-3 pt-6">
          <Button asChild={true} type="button" variant="ghost">
            <Link to="/rules">{RULES_COPY.cancelAction}</Link>
          </Button>
          <Button disabled={submitDisabled} type="submit" variant="outline">
            {RULES_COPY.saveAction}
          </Button>
        </CardFooter>
      </Form>
    </Card>
  );
};
