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
import { PencilIcon } from 'lucide-react';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  SKILL_DETAIL_COPY,
  SKILLS_SOURCE_COPY,
} from '~/routing/skills/data/data.copy';
import { getResolvedModelInvocationDisplay } from '~/routing/skills/utils/model-invocation-badge';

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
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(content);
  const wasSavingRef = React.useRef(false);

  // Setup
  const isOpenThrottle = entry.source === 'openthrottle';
  const { badge: invocationBadge } = getResolvedModelInvocationDisplay(entry);
  const isDirty = draft !== content;
  const sourceTooltip = isOpenThrottle
    ? SKILLS_SOURCE_COPY.openthrottleTooltip
    : entry.sourceUrl
      ? `${SKILLS_SOURCE_COPY.externalUrlTooltipPrefix} ${entry.sourceUrl}`
      : SKILLS_SOURCE_COPY.externalTooltip;

  // Handlers
  const handleEdit = (): void => {
    setDraft(content);
    setIsEditing(true);
  };

  const handleCancel = (): void => {
    setDraft(content);
    setIsEditing(false);
  };

  const handleDraftChange = (value: string | undefined): void => {
    setDraft(value ?? '');
  };

  const handleSave = (): void => {
    onSave?.(draft);
  };

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

  const editControls = isEditing ? (
    <div className="flex items-center gap-2">
      {saveError ? (
        <p
          className="text-destructive text-xs"
          data-testid="skill-save-error"
          role="alert"
        >
          {saveError}
        </p>
      ) : null}
      <Button
        data-testid="skill-save-button"
        disabled={!isDirty || saving}
        onClick={handleSave}
        size="xs"
      >
        {SKILL_DETAIL_COPY.saveLabel}
      </Button>
      <Button
        data-testid="skill-cancel-button"
        disabled={saving}
        onClick={handleCancel}
        size="xs"
        variant="outline"
      >
        {SKILL_DETAIL_COPY.cancelLabel}
      </Button>
    </div>
  ) : editable ? (
    <Button
      data-testid="skill-edit-button"
      onClick={handleEdit}
      size="xs"
      variant="outline"
    >
      <PencilIcon className="size-4" />
      {SKILL_DETAIL_COPY.editLabel}
    </Button>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        {/* span keeps the tooltip live over the disabled button */}
        <span data-testid="skill-edit-disabled">
          <Button disabled={true} size="xs" variant="outline">
            <PencilIcon className="size-4" />
            {SKILL_DETAIL_COPY.editLabel}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs" side="top">
        {SKILL_DETAIL_COPY.editDisabledTooltip}
      </TooltipContent>
    </Tooltip>
  );

  // Life Cycle
  React.useEffect(() => {
    // A save that finished without a rejection revalidated the loader; leave
    // edit mode and let the read view pick up the fresh content.
    if (wasSavingRef.current && !saving && !saveError) {
      setIsEditing(false);
    }
    wasSavingRef.current = saving;
  }, [saveError, saving]);

  React.useEffect(() => {
    // Keep a non-dirty draft following loader revalidations (e.g. post-save).
    if (!isEditing) {
      setDraft(content);
    }
  }, [content, isEditing]);

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

          {editControls}
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
