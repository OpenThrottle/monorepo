import type { FragmentIntent } from '~/routing/fragments/data/data.intents';

/**
 * @description One server validation issue: the JSON Pointer of the failing value (`''` for the
 * fragment as a whole) and what is wrong with it.
 */
export interface FragmentIssue {
  readonly message: string;
  readonly path: string;
}

/**
 * @description What the fragment route's action returns for any intent.
 */
export type FragmentActionResult =
  | {
      readonly issues: readonly FragmentIssue[];
      readonly message: string;
      readonly ok: false;
    }
  | { readonly intent: FragmentIntent; readonly ok: true };
