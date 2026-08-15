import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SkillDetailEditControls } from '~/routing/skills/components/SkillDetailEditControls';
import { SkillRunControl } from '~/routing/skills/components/SkillRunControl';
import type { RunSkillRunOptions } from '~/routing/skills/components/SkillRunControl';
import type { RunSkillPayload } from '~/routing/skills/components/RunSkillDialog';
import {
  SKILL_DETAIL_COPY,
  SKILLS_SOURCE_COPY,
} from '~/routing/skills/data/data.copy';
import type { ModelInvocationBadge } from '~/routing/skills/utils/model-invocation-badge';

export interface SkillIntroductionProps {
  readonly editable: boolean;
  readonly entry: RepoSkillEntry;
  readonly invocationBadge: ModelInvocationBadge;
  readonly isDirty: boolean;
  readonly isEditing: boolean;
  readonly isOpenThrottle: boolean;
  readonly onCancel: () => void;
  readonly onEdit: () => void;
  readonly onRun: ((payload: RunSkillPayload) => void) | undefined;
  readonly onSave: () => void;
  readonly runOptions: Promise<RunSkillRunOptions> | undefined;
  readonly saveError: string | undefined;
  readonly saving: boolean;
  readonly sourceTooltip: string;
}

/**
 * @description Title, source/invocation/tag badges, path copy, and run/edit
 * controls for a skill detail view.
 */
export const SkillIntroduction = (
  props: SkillIntroductionProps,
): React.ReactElement => {
  const {
    editable,
    entry,
    invocationBadge,
    isDirty,
    isEditing,
    isOpenThrottle,
    onCancel,
    onEdit,
    onRun,
    onSave,
    runOptions,
    saveError,
    saving,
    sourceTooltip,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const sourceBadge = (
    <Badge
      color={isOpenThrottle ? 'violet' : 'slate'}
      data-testid="skill-source-badge"
      size="xs"
    >
      {isOpenThrottle
        ? SKILLS_SOURCE_COPY.openthrottleLabel
        : SKILLS_SOURCE_COPY.externalLabel}
    </Badge>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-2" data-testid="SkillIntroduction">
      <div className="flex flex-wrap items-center gap-4">
        <GlobalHeading heading="h1" title={`/${entry.slug}`} />

        <Tooltip>
          <TooltipTrigger asChild={true}>
            {!isOpenThrottle && entry.sourceUrl ? (
              <a
                data-testid="skill-source-link"
                href={entry.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                {sourceBadge}
              </a>
            ) : (
              sourceBadge
            )}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs" side="top">
            {sourceTooltip}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild={true}>
            <Badge color={invocationBadge.color} size="xs">
              {invocationBadge.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs" side="top">
            {invocationBadge.tooltip}
          </TooltipContent>
        </Tooltip>

        {(entry.tags ?? []).map((tag) => (
          <Badge color="blue" key={tag} size="xs">
            {tag}
          </Badge>
        ))}

        <div className="flex-1" />

        <SkillRunControl entry={entry} onRun={onRun} runOptions={runOptions} />

        <SkillDetailEditControls
          editable={editable}
          isDirty={isDirty}
          isEditing={isEditing}
          onCancel={onCancel}
          onEdit={onEdit}
          onSave={onSave}
          saveError={saveError}
          saving={saving}
        />
      </div>

      <p className="text-muted-foreground text-sm">{entry.summary}</p>

      <div className="flex items-center gap-2">
        <code className="text-muted-foreground text-xs">
          {entry.repoRelativePath}
        </code>
        <Button size="xs" variant="outline">
          <OpenThrottleClipboard
            label={SKILL_DETAIL_COPY.pathCopyLabel}
            text={entry.repoRelativePath}
          />
        </Button>
      </div>
    </div>
  );
};
