import { LINKED_ARTIFACTS_PANEL_COPY } from '~/routing/plans/data/data.copy';
import { LINKED_ARTIFACT_GROUP_LABELS } from '~/routing/plans/data/data.linked-artifacts-panel-groups';
import { ARTIFACT_FILTER_ALL } from '~/routing/plans/utils/summarizeLinkedArtifacts';

/**
 * @description Label for a verification filter button: the "all" sentinel reads
 * as copy, every real verification state is shown as-is.
 */
export const getVerificationFilterLabel = (value: string): string => {
  if (value === ARTIFACT_FILTER_ALL) {
    return LINKED_ARTIFACTS_PANEL_COPY.allVerificationsLabel;
  }

  return value;
};

/**
 * @description Label for an artifact type filter chip: the "all" sentinel reads
 * as copy, a known type gets its group label, an unknown type falls back to the
 * raw value.
 */
export const getTypeFilterLabel = (value: string): string => {
  if (value === ARTIFACT_FILTER_ALL) {
    return LINKED_ARTIFACTS_PANEL_COPY.allTypesLabel;
  }

  return LINKED_ARTIFACT_GROUP_LABELS[value] ?? value;
};
