/**
 * @description Adapter from the typed episode registry to the TTS stage's shape.
 *
 * This file used to read `docs/marketing/scripts/<slug>.md`, parse its front
 * matter with its own regex, walk the markdown table and split the narration
 * column. All of that is gone: episodes are typed modules and the registry is the
 * only thing that knows what exists.
 *
 * What survives is the contract the markdown format got right, and the return
 * shape, so `narrate.ts`, the render cache and the timings writer are unchanged:
 * the narration text is the literal TTS input, and sentences are the atomic unit
 * so a re-record of one line does not invalidate a whole take.
 */

import { getEpisode, resolveVariant } from '../episodes/registry';
import { sentences } from '../episodes/derived';
import type { ParsedScript } from './types';

/**
 * @public Load a script's narration, optionally choosing a variant.
 *
 * Omitting `variantId` resolves the episode's `selectedVariant` — the take that
 * ships. An unknown episode or variant throws naming what does exist, rather than
 * the "missing front matter" error this used to produce for a mistyped slug.
 */
export const parseScript = (slug: string, variantId?: string): ParsedScript => {
  const episode = getEpisode(slug);
  const variant = resolveVariant(episode, variantId);

  return {
    format: episode.format,
    sentences: sentences(variant),
    slug,
    title: episode.youtube.title,
    variant: variant.id,
  };
};
