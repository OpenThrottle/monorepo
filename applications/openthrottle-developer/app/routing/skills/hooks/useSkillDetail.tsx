import * as React from 'react';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILL_DETAIL_COPY } from '~/routing/skills/data/data.copy';
import { getResolvedModelInvocationDisplay } from '~/routing/skills/utils/model-invocation-badge';

export interface SkillDetailOptions {
  /** Raw SKILL.md content; the pristine draft seed. */
  content: string;
  /** Local checkout with a resolved monorepo root — the route-level precondition. */
  editable: boolean;
  entry: RepoSkillEntry;
  /** Invoked with the full draft on Save; wired to the route action. */
  onSave?: (draft: string) => void;
  /** Action-side rejection message, shown inline next to Save. */
  saveError?: string;
  /** True while a save is submitting; disables Save/Cancel. */
  saving: boolean;
}

export interface UseSkillDetailResult {
  /** True only when the checkout AND provenance both allow an edit. */
  canEdit: boolean;
  draft: string;
  /** Why editing is blocked; meaningless when `canEdit` is true. */
  editDisabledTooltip: string;
  handleCancel: () => void;
  handleDraftChange: (value: string | undefined) => void;
  handleEdit: () => void;
  handleSave: () => void;
  invocationBadge: ReturnType<
    typeof getResolvedModelInvocationDisplay
  >['badge'];
  isDirty: boolean;
  isEditing: boolean;
}

/**
 * @description Edit-mode/draft state and save lifecycle tracking for the skill
 * detail view. Source-badge presentation lives in `getSkillSourceBadge`.
 * Extracted from SkillDetail per component-primitive-shape R6/R7.
 */
export const useSkillDetail = (
  options: SkillDetailOptions,
): UseSkillDetailResult => {
  const { content, editable, entry, onSave, saveError, saving } = options;

  // Hooks
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(content);
  const wasSavingRef = React.useRef(false);

  // Setup
  // Authored here, authored in this repository (custom), or your own personal
  // tier — either way the file is yours to edit. Only a lockfile-installed
  // external skill is off limits.
  const isEditableProvenance =
    entry.source === 'openthrottle' ||
    entry.isCustom === true ||
    entry.isPersonal === true;
  const { badge: invocationBadge } = getResolvedModelInvocationDisplay(entry);
  const isDirty = draft !== content;
  // Editing a lockfile-installed SKILL.md forks it from upstream, so provenance
  // gates edit mode on top of the checkout precondition. `writeSkillFileBySlug`
  // is the authoritative gate; this only keeps the user out of a doomed draft.
  const canEdit = editable && isEditableProvenance;
  // Provenance is the more specific blocker, so it wins when both apply.
  const editDisabledTooltip = isEditableProvenance
    ? SKILL_DETAIL_COPY.editDisabledTooltip
    : SKILL_DETAIL_COPY.editExternalTooltip;

  // Handlers
  const handleEdit = (): void => {
    // Hardened against a caller threading the wrong prop: edit mode is
    // unreachable when the gate is closed.
    if (!canEdit) {
      return;
    }
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

  return {
    canEdit,
    draft,
    editDisabledTooltip,
    handleCancel,
    handleDraftChange,
    handleEdit,
    handleSave,
    invocationBadge,
    isDirty,
    isEditing,
  };
};
