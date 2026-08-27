import * as React from 'react';
import { PlanDeferredSection } from '~/routing/plans/components/PlanDeferredSection';
import { PlanTagChips } from '~/routing/plans/components/PlanTagChips';
import type {
  PlanTagChipData,
  PlanTagVocabularyOption,
} from '~/routing/plans/components/PlanTagChips';
import { PlanToolbarTagsSkeleton } from '~/routing/plans/components/PlanToolbarTagsSkeleton';
import { PLAN_DEFERRED_SECTION_COPY } from '~/routing/plans/data/data.copy';

export interface PlanToolbarTagsProps {
  readonly onAddTag?: (tag: string) => void;
  readonly onRemoveTag?: (tag: string) => void;
  readonly pending: boolean;
  readonly tags?: PlanTagChipData[];
  /** @description Tag vocabulary for the add-tag dropdown, as the loader's deferred promise. */
  readonly vocabulary?: Promise<PlanTagVocabularyOption[]>;
}

/**
 * @description The toolbar's tag-chip region behind its own boundary, so the
 * rest of the toolbar paints from critical data while the vocabulary streams in.
 */
export const PlanToolbarTags = (
  props: PlanToolbarTagsProps,
): React.ReactElement | null => {
  const { onAddTag, onRemoveTag, pending, tags, vocabulary } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  // The toolbar renders tags only when it has everything the chips need; owning
  // that guard here keeps the caller's JSX to a single element.
  if (
    onAddTag == null ||
    onRemoveTag == null ||
    tags == null ||
    vocabulary == null
  ) {
    return null;
  }

  return (
    <PlanDeferredSection
      errorText={PLAN_DEFERRED_SECTION_COPY.tagVocabularyError}
      fallback={<PlanToolbarTagsSkeleton />}
      resolve={vocabulary}
    >
      {(resolvedVocabulary) => (
        <PlanTagChips
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          pending={pending}
          tags={tags}
          vocabulary={resolvedVocabulary}
        />
      )}
    </PlanDeferredSection>
  );
};
