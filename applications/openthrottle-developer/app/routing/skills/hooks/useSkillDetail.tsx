import * as React from 'react';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILLS_SOURCE_COPY } from '~/routing/skills/data/data.copy';
import { getResolvedModelInvocationDisplay } from '~/routing/skills/utils/model-invocation-badge';

export interface SkillDetailOptions {
  /** Raw SKILL.md content; the pristine draft seed. */
  content: string;
  entry: RepoSkillEntry;
  /** Invoked with the full draft on Save; wired to the route action. */
  onSave?: (draft: string) => void;
  /** Action-side rejection message, shown inline next to Save. */
  saveError?: string;
  /** True while a save is submitting; disables Save/Cancel. */
  saving: boolean;
}

export interface UseSkillDetailResult {
  draft: string;
  handleCancel: () => void;
  handleDraftChange: (value: string | undefined) => void;
  handleEdit: () => void;
  handleSave: () => void;
  invocationBadge: ReturnType<
    typeof getResolvedModelInvocationDisplay
  >['badge'];
  isDirty: boolean;
  isEditing: boolean;
  isOpenThrottle: boolean;
  sourceTooltip: string;
}

/**
 * @description Edit-mode/draft state, save lifecycle tracking, and derived
 * badge/tooltip display values for the skill detail view. Extracted from
 * SkillDetail per component-primitive-shape R6/R7.
 */
export const useSkillDetail = (
  options: SkillDetailOptions,
): UseSkillDetailResult => {
  const { content, entry, onSave, saveError, saving } = options;

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
  };
};
