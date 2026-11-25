import { atom } from 'jotai';

import type { CmsFragment } from '../types/cms-fragment';

/**
 * @description The fragment currently selected in the editor, or `undefined` when none is.
 * @public
 */
export const atomFragmentDefault: CmsFragment | undefined = undefined;

/**
 * @public
 */
export const atomFragment = atom<CmsFragment | undefined>(atomFragmentDefault);
