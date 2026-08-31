/**
 * @description The curated shortlist shown when the OpenRouter picker group is
 * collapsed.
 *
 * OpenRouter publishes several hundred routable models (396 on 2026-08-29). A
 * flat list that long is unusable, and the picker already filters within the
 * active group — so the collapsed default shows a small, recognizable subset and
 * the full catalog is one keystroke behind the search box.
 *
 * The shortlist is derived, not enumerated: hardcoding model ids would rot on
 * every vendor release. Instead we keep the list of VENDOR prefixes worth
 * leading with and take the first few entries each contributes to the
 * (alphabetically sorted, de-duplicated) catalog, skipping suffixed routes.
 * That is a heuristic, and it is meant to be one — it only decides what shows
 * before the user types.
 */

/**
 * Vendor prefixes that lead the collapsed group, in display order. A vendor
 * absent from the catalog simply contributes nothing.
 */
export const OPENROUTER_SHORTLIST_VENDORS: readonly string[] = [
  `anthropic`,
  `openai`,
  `google`,
  `x-ai`,
  `deepseek`,
  `meta-llama`,
  `mistralai`,
  `qwen`,
];

/** How many models each shortlisted vendor may contribute. */
export const OPENROUTER_SHORTLIST_PER_VENDOR = 3;

/**
 * Suffix marking a non-default ROUTE of a model (`…:free`, `…:batch`,
 * `…:thinking`). These are real, selectable ids and stay in the full catalog —
 * they are just not what a first-time picker should lead with.
 */
const ROUTE_VARIANT_SEPARATOR = `:`;

/**
 * Whether `modelId` belongs on the collapsed shortlist: it is the plain route of
 * a model published by one of {@link OPENROUTER_SHORTLIST_VENDORS}, and its
 * vendor has not already contributed
 * {@link OPENROUTER_SHORTLIST_PER_VENDOR} entries.
 *
 * `counts` is mutated as vendors fill up, so callers pass one map across a
 * single pass over the catalog.
 *
 * @public
 */
export function isShortlistedOpenRouterModel(
  modelId: string,
  counts: Map<string, number>,
): boolean {
  if (modelId.includes(ROUTE_VARIANT_SEPARATOR)) {
    return false;
  }

  const vendor = modelId.slice(0, modelId.indexOf(`/`));
  if (!OPENROUTER_SHORTLIST_VENDORS.includes(vendor)) {
    return false;
  }

  const used = counts.get(vendor) ?? 0;
  if (used >= OPENROUTER_SHORTLIST_PER_VENDOR) {
    return false;
  }

  counts.set(vendor, used + 1);

  return true;
}
