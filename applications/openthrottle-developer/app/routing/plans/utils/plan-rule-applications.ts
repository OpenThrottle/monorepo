/**
 * @description Pure helpers for {@link PlanRuleApplications}: attention-queue
 * ordering rank and detailsJson pretty-printing. Hoisted out of the component
 * per component-primitive-shape R4.
 */

/** Flagged/orphaned rows are the attention queue; rank them first. */
export const attentionRank = (state: string): number =>
  state === 'flagged' ? 0 : state === 'orphaned' ? 1 : 2;

/** Render a rule application's detailsJson as a compact `key: value` line; falls back to the raw string. */
export const renderDetails = (
  detailsJson: string | null | undefined,
): string | null => {
  if (detailsJson == null || detailsJson === '') return null;
  try {
    const parsed: unknown = JSON.parse(detailsJson);
    if (typeof parsed !== 'object' || parsed === null) return detailsJson;
    return Object.entries(parsed)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(' · ');
  } catch {
    return detailsJson;
  }
};
