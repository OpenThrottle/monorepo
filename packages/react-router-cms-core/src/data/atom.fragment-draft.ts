import { atom } from 'jotai';

import type { CmsFragmentDraft } from '../types/cms-render';

/**
 * @description No edits yet.
 * @public
 */
export const atomFragmentDraftDefault: CmsFragmentDraft = {};

/**
 * @description The selected fragment's unsaved `properties`. The form fields read and write it; the
 * form serialises it on submit. Replaces upstream's untyped `atomComponent`.
 * @public
 */
export const atomFragmentDraft = atom<CmsFragmentDraft>(
  atomFragmentDraftDefault,
);
