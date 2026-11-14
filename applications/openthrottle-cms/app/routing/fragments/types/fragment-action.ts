import type { CmsActionFailure } from '~/global/types/cms-action';
import type { FragmentIntent } from '~/routing/fragments/data/data.intents';

/**
 * @description What the fragment route's action returns for any intent.
 */
export type FragmentActionResult =
  CmsActionFailure | { readonly intent: FragmentIntent; readonly ok: true };
