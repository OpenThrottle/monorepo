import { atom } from 'jotai';

import type { CmsFragment } from '../types';

/**
 * @description The fragments available to the editor (the component palette).
 * @public
 */
export const atomFragmentsDefault: readonly CmsFragment[] = [];

/**
 * @public
 */
export const atomFragments = atom<readonly CmsFragment[]>(atomFragmentsDefault);
