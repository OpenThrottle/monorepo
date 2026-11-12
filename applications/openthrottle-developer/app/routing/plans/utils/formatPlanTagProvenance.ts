import type { PlanTagChipData } from '~/routing/plans/components/PlanTagChips';

/** Human-readable provenance for a plan tag chip's tooltip. */
export const formatPlanTagProvenance = (tag: PlanTagChipData): string => {
  return tag.confidence != null
    ? `${tag.source} · confidence ${tag.confidence}`
    : tag.source;
};
