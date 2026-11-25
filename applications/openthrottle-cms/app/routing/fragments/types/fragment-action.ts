import type { CmsActionFailure } from '~/global/types/cms-action';
import type { FragmentIntentValue } from '~/routing/fragments/data/intents';

/**
 * @description What the fragment route's action returns for any intent.
 */
export type FragmentActionResult =
  | CmsActionFailure
  | { readonly intent: FragmentIntentValue; readonly ok: true };
