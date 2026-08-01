import * as React from 'react';
import clsx from 'clsx';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Editor } from '@openthrottle/react-router-editor';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SkillDetailEditControls } from '~/routing/skills/components/SkillDetailEditControls';
import {
  SKILL_DETAIL_COPY,
  SKILLS_SOURCE_COPY,
} from '~/routing/skills/data/data.copy';
import { useSkillDetail } from '~/routing/skills/hooks/useSkillDetail';

export interface SkillDetailProps {
  className?: string;
  /** Raw SKILL.md content; empty renders the unreadable-file notice. */
  content: string;
  /** Local checkout with a resolved monorepo root — edit mode available. */
  editable: boolean;
  entry: RepoSkillEntry;
  /** Invoked with the full draft on Save; wired to the route action. */
  onSave?: (draft: string) => void;
  /** Action-side rejection message, shown inline next to Save. */
  saveError?: string;
  /** True while a save is submitting; disables Save/Cancel. */
  saving?: boolean;
}

export const SkillDetail = (props: SkillDetailProps): React.ReactElement => {
  const {
    className,
    content,
    editable,
    entry,
    onSave,
    saveError,
    saving = false,
  } = props;

  // Hooks
  const {
    draft,
    handleCancel,
    handleDraftChange,
    handleEdit,
    handleSave,
    invocationBadge,
    isDirty,
    isEditing,
    isOpenThrottle,
    sourceTooltip,
  } = useSkillDetail({ content, entry, onSave, saveError, saving });

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
    <div
      className={clsx('flex flex-col gap-4', className)}
      data-testid="SkillDetail"
    >
      <div className="flex flex-col gap-2">
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

          <SkillDetailEditControls
            editable={editable}
            isDirty={isDirty}
            isEditing={isEditing}
            onCancel={handleCancel}
            onEdit={handleEdit}
            onSave={handleSave}
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

      {isEditing ? (
        <div
          className="ui-border flex h-[70vh] flex-col overflow-hidden rounded-lg border"
          data-testid="skill-editor"
        >
          <Editor
            language="markdown"
            onChange={handleDraftChange}
            path={entry.repoRelativePath}
            showSidebar={false}
            showTabs={false}
            showToolbar={false}
            value={draft}
          />
        </div>
      ) : (
        <div className="ui-border bg-card rounded-lg border p-6">
          {content.length > 0 ? (
            <MarkdownRenderer source={content} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {SKILL_DETAIL_COPY.emptyContentNotice}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
