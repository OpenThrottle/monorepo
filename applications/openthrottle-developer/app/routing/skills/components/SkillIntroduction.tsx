import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { BrainCircuitIcon } from 'lucide-react';
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
  readonly tagPending?: boolean;
  readonly tagVocabulary?: readonly SkillTagVocabularyOption[];
}

/**
 * @description Standard detail-route chrome for a skill: a `GlobalHeading`
 * carrying the slug and the run/edit/orphan actions, then a metadata row of
 * source, invocation and tag badges, then the repo-relative path with a copy
 * affordance. Mirrors {@link PlanDetailRouteHeader} rather than packing every
 * badge onto the title row. The skill's summary is deliberately absent — the
 * Skill tab already renders the whole SKILL.md.
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

  const isOrphaned = entry.orphanedAt != null;

  // An orphan carries no repo-relative path, so the copy row would offer an
  // empty string. Show it only when there is something to copy.
  const showPath = entry.repoRelativePath !== '';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-2" data-testid="SkillIntroduction">
      <GlobalHeading heading="h1" icon={BrainCircuitIcon} title={entry.slug}>
        <div className="flex flex-wrap items-center gap-2">
          {isOrphaned && onRemoveOrphan != null ? (
            <SkillOrphanRemoveButton
              disabled={tagPending}
              onRemove={onRemoveOrphan}
            />
          ) : null}

          <SkillRunControl
            entry={entry}
            onRun={onRun}
            runOptions={runOptions}
          />

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
      </GlobalHeading>

      <div
        aria-label={SKILL_DETAIL_COPY.metadataLabel}
        className="flex flex-wrap items-center gap-2"
        data-testid="skill-introduction-metadata"
      >
        <SkillIntroductionBadges
          entry={entry}
          invocationBadge={invocationBadge}
          showReadOnlyTags={showReadOnlyTags}
        />

        {isOrphaned ? (
          <Badge color="yellow" data-testid="skill-orphan-badge" size="xs">
            {SKILL_RECORD_TAGS_COPY.orphanBadge}
          </Badge>
        ) : null}

        {onAddTag != null && onRemoveTag != null && tagVocabulary != null ? (
          <SkillTagChips
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            pending={tagPending}
            tags={entry.tags ?? []}
            vocabulary={tagVocabulary}
          />
        ) : null}
      </div>

      {showPath ? (
        <div className="flex items-center gap-2">
          <code className="text-muted-foreground text-xs">
            {entry.repoRelativePath}
          </code>
          {/* asChild — OpenThrottleClipboard renders its own <button>, so a
              wrapping Button would nest one inside another and break hydration. */}
          <Button asChild={true} size="xs" variant="outline">
            <OpenThrottleClipboard
              label={SKILL_DETAIL_COPY.pathCopyLabel}
              text={entry.repoRelativePath}
            />
          </Button>
        </div>
      ) : null}
    </div>
  );
};
