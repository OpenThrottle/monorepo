import type { CmsActionFailure } from '~/global/types/cms-action';

/**
 * @description What the component route's action returns.
 */
export type ComponentActionResult = CmsActionFailure | { readonly ok: true };
