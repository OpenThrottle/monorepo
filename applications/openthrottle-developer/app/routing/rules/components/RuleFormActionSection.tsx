import * as React from 'react';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { RULES_COPY } from '~/routing/rules/data/data.copy';

export interface RuleFormActionSectionProps {
  actionType: string;
  onActionTypeChange: (actionType: string) => void;
  onPlacementChange: (placement: string) => void;
  onSkillSlugChange: (skillSlug: string) => void;
  onSlugAllowChange: (value: string) => void;
  onSlugDenyChange: (value: string) => void;
  onTagAllowChange: (value: string) => void;
  onTagDenyChange: (value: string) => void;
  onTitleTemplateChange: (value: string) => void;
  placement: string;
  skillSlug: string;
  skillSlugs: string[];
  slugAllow: string;
  slugDeny: string;
  tagAllow: string;
  tagDeny: string;
  titleTemplate: string;
}

/**
 * @description The "Action" fieldset of the rules form: the action-type select
 * plus the inject-task (skill/placement/title template) or
 * availability-exception (allow/deny lists) payload fields. Split out of
 * RuleForm to keep that component under the R6 size cap.
 */
export const RuleFormActionSection = (
  props: RuleFormActionSectionProps,
): React.ReactElement => {
  const {
    actionType,
    onActionTypeChange,
    onPlacementChange,
    onSkillSlugChange,
    onSlugAllowChange,
    onSlugDenyChange,
    onTagAllowChange,
    onTagDenyChange,
    onTitleTemplateChange,
    placement,
    skillSlug,
    skillSlugs,
    slugAllow,
    slugDeny,
    tagAllow,
    tagDeny,
    titleTemplate,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{RULES_COPY.actionLegend}</h3>
        <p className="text-muted-foreground text-xs">
          {RULES_COPY.actionDescription}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rule-action-type">{RULES_COPY.actionTypeLabel}</Label>
        <Select onValueChange={onActionTypeChange} value={actionType}>
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
            <Label htmlFor="rule-skill-slug">{RULES_COPY.skillLabel}</Label>
            <Select onValueChange={onSkillSlugChange} value={skillSlug}>
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
            <Label htmlFor="rule-placement">{RULES_COPY.placementLabel}</Label>
            <Select onValueChange={onPlacementChange} value={placement}>
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
              onChange={(event) => onTitleTemplateChange(event.target.value)}
              placeholder={RULES_COPY.titleTemplatePlaceholder}
              value={titleTemplate}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            aria-label="Tag allow list"
            onChange={(event) => onTagAllowChange(event.target.value)}
            placeholder={RULES_COPY.tagAllowPlaceholder}
            value={tagAllow}
          />
          <Input
            aria-label="Tag deny list"
            onChange={(event) => onTagDenyChange(event.target.value)}
            placeholder={RULES_COPY.tagDenyPlaceholder}
            value={tagDeny}
          />
          <Input
            aria-label="Slug allow list"
            onChange={(event) => onSlugAllowChange(event.target.value)}
            placeholder={RULES_COPY.slugAllowPlaceholder}
            value={slugAllow}
          />
          <Input
            aria-label="Slug deny list"
            onChange={(event) => onSlugDenyChange(event.target.value)}
            placeholder={RULES_COPY.slugDenyPlaceholder}
            value={slugDeny}
          />
        </div>
      )}
    </section>
  );
};
