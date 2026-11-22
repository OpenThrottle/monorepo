/**
 * @description Choose between the whole-take and per-sentence render paths.
 */

import type { RenderMode, TtsBackend } from './types.ts';
import { RENDER_MODE } from './types.ts';

export interface SelectRenderModeOptions {
  readonly backend: TtsBackend;
  /** The `--per-sentence` flag: force the per-sentence path. */
  readonly perSentence: boolean;
}

/**
 * @description Whole-take when the backend offers `renderTake`, unless the caller
 * forced per-sentence.
 */
export const selectRenderMode = (
  options: SelectRenderModeOptions,
): RenderMode => {
  if (options.perSentence || options.backend.renderTake === undefined) {
    return RENDER_MODE.PER_SENTENCE;
  }

  return RENDER_MODE.WHOLE_TAKE;
};
