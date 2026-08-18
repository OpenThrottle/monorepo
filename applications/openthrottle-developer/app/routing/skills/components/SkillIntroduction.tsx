import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SkillDetailEditControls } from '~/routing/skills/components/SkillDetailEditControls';
import { SkillIntroductionBadges } from '~/routing/skills/components/SkillIntroductionBadges';
import { SkillOrphanRemoveButton } from '~/routing/skills/components/SkillOrphanRemoveButton';
import { SkillRunControl } from '~/routing/skills/components/SkillRunControl';
import type { RunSkillRunOptions } from '~/routing/skills/components/SkillRunControl';
import type { RunSkillPayload } from '~/routing/skills/components/RunSkillDialog';
import {
  SkillTagChips,
  type SkillTagVocabularyOption,
} from '~/routing/skills/components/SkillTagChips';
import {
  SKILL_DETAIL_COPY,
  SKILL_RECORD_TAGS_COPY,
} from '~/routing/skills/data/data.copy';
import type { ModelInvocationBadge } from '~/routing/skills/utils/model-invocation-badge';

export interface SkillIntroductionProps {
  /** Checkout AND provenance both allow an edit. */
  readonly canEdit: boolean;
  /** Why editing is blocked; rendered in the disabled-Edit tooltip. */
  readonly editDisabledTooltip: string;
  readonly entry: RepoSkillEntry;
  readonly invocationBadge: ModelInvocationBadge;
  readonly isDirty: boolean;
  readonly isEditing: boolean;
  readonly isOpenThrottle: boolean;
  readonly onAddTag?: (tag: string) => void;
  readonly onCancel: () => void;
  readonly onEdit: () => void;
  readonly onRemoveOrphan?: () => void;
  readonly onRemoveTag?: (tag: string) => void;
  readonly onRun: ((payload: RunSkillPayload) => void) | undefined;
  readonly onSave: () => void;
  readonly runOptions: Promise<RunSkillRunOptions> | undefined;
  readonly saveError: string | undefined;
  readonly saving: boolean;
  readonly sourceTooltip: string;
  readonly tagPending?: boolean;
  readonly tagVocabulary?: readonly SkillTagVocabularyOption[];
}

/**
 * @description Title, source/invocation/tag badges, path copy, and run/edit
 * controls for a skill detail view.
 */
export const SkillIntroduction = (
  props: SkillIntroductionProps,
): React.ReactElement => {
  const {
    canEdit,
    editDisabledTooltip,
    entry,
    invocationBadge,
    isDirty,
    isEditing,
    isOpenThrottle,
    onAddTag,
    onCancel,
    onEdit,
    onRemoveOrphan,
    onRemoveTag,
    onRun,
    onSave,
    runOptions,
    saveError,
    saving,
    sourceTooltip,
    tagPending = false,
    tagVocabulary,
  } = props;

  // Hooks

  // Setup
  // Read-only badges when the record isn't editable through the tag chips
  // (no add handler or no vocabulary loaded); otherwise the chips own display.
  const showReadOnlyTags =
    (entry.tags ?? []).length > 0 &&
    (onAddTag == null || tagVocabulary == null);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-2" data-testid="SkillIntroduction">
      <div className="flex flex-wrap items-center gap-4">
        <GlobalHeading heading="h1" title={`/${entry.slug}`} />

        <SkillIntroductionBadges
          entry={entry}
          invocationBadge={invocationBadge}
          isOpenThrottle={isOpenThrottle}
          showReadOnlyTags={showReadOnlyTags}
          sourceTooltip={sourceTooltip}
        />

        {onAddTag != null && onRemoveTag != null && tagVocabulary != null ? (
          <SkillTagChips
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            pending={tagPending}
            tags={entry.tags ?? []}
            vocabulary={tagVocabulary}
          />
        ) : null}

        {entry.orphanedAt != null ? (
          <Badge color="yellow" data-testid="skill-orphan-badge" size="xs">
            {SKILL_RECORD_TAGS_COPY.orphanBadge}
          </Badge>
        ) : null}

        <div className="flex-1" />

        {entry.orphanedAt != null && onRemoveOrphan != null ? (
          <SkillOrphanRemoveButton
            disabled={tagPending}
            onRemove={onRemoveOrphan}
          />
        ) : null}

        <SkillRunControl entry={entry} onRun={onRun} runOptions={runOptions} />

        <SkillDetailEditControls
          disabledTooltip={editDisabledTooltip}
          editable={canEdit}
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
