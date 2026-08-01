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
} from '@openthrottle/react-router-shadcn';
import { Form, Link } from 'react-router';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { ANY } from '~/routing/rules/data/rule-form-options';
import { RuleFormActionSection } from '~/routing/rules/components/RuleFormActionSection';
import { RuleFormMatchSection } from '~/routing/rules/components/RuleFormMatchSection';
import { useRuleForm } from '~/routing/rules/hooks/useRuleForm';
import type { TagActionRuleRowData } from '~/routing/rules/components/RulesTable';
import { WandSparklesIcon } from 'lucide-react';

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

export const RuleForm = (props: RuleFormProps): React.ReactElement => {
  const { actionData, initialRule, skillSlugs, vocabulary } = props;

  // Hooks
  const form = useRuleForm({ initialRule });

  // Setup
  // Re-derived from the prop (not form.isEdit) so TS narrows `initialRule.id`.
  const isEdit = initialRule != null;
  const error = actionData?.error;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={WandSparklesIcon}
          title="Rules"
        />
        <p className="text-muted-foreground text-sm">
          Plans are OpenThrottle&apos;s record of intended work—what you decided
          to build, broken into tasks with status, assignee, and optional
          summaries. Browse and filter here, open a plan for tasks and iteration
          output, queue a run for agentic execution (Ralph), and follow linked
          commits that tie shipped work on main back to each plan.
        </p>
      </div>
      <Card className="max-w-2xl-- w-full gap-8" data-testid="RuleForm">
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
            <input name="actionType" type="hidden" value={form.actionType} />
            <input
              name="actionPayloadJson"
              type="hidden"
              value={form.actionPayloadJson}
            />
            <input
              name="status"
              type="hidden"
              value={form.status === ANY ? '' : form.status}
            />
            <input
              name="environment"
              type="hidden"
              value={form.environment === ANY ? '' : form.environment}
            />
            {form.tagAll.map((tag) => (
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
                  onChange={(event) => form.setTitle(event.target.value)}
                  placeholder={RULES_COPY.titlePlaceholder}
                  required={true}
                  value={form.title}
                />
              </div>
            </section>

            {/* Match */}
            <RuleFormMatchSection
              environment={form.environment}
              onEnvironmentChange={form.setEnvironment}
              onStatusChange={form.setStatus}
              onToggleTag={form.handleToggleTag}
              status={form.status}
              tagAll={form.tagAll}
              vocabulary={vocabulary}
            />

            {/* Action */}
            <RuleFormActionSection
              actionType={form.actionType}
              onActionTypeChange={form.setActionType}
              onPlacementChange={form.setPlacement}
              onSkillSlugChange={form.setSkillSlug}
              onSlugAllowChange={form.setSlugAllow}
              onSlugDenyChange={form.setSlugDeny}
              onTagAllowChange={form.setTagAllow}
              onTagDenyChange={form.setTagDeny}
              onTitleTemplateChange={form.setTitleTemplate}
              placement={form.placement}
              skillSlug={form.skillSlug}
              skillSlugs={skillSlugs}
              slugAllow={form.slugAllow}
              slugDeny={form.slugDeny}
              tagAllow={form.tagAllow}
              tagDeny={form.tagDeny}
              titleTemplate={form.titleTemplate}
            />

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
            <Button
              disabled={form.submitDisabled}
              type="submit"
              variant="outline"
            >
              {RULES_COPY.saveAction}
            </Button>
          </CardFooter>
        </Form>
      </Card>
    </>
  );
};
