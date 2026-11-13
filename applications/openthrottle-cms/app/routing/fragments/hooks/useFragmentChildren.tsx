import type {
  CmsFormChildren,
  CmsFragmentRecord,
} from '@openthrottle/react-router-cms-core';
import * as React from 'react';
import { useSubmit } from 'react-router';

import { FRAGMENT_INTENT } from '~/routing/fragments/data/data.intents';

export interface UseFragmentChildrenOptions {
  /** Where cms-core's "Add children" link points. */
  readonly addHref: string;
  /** The saved children, in order; a change (after revalidation) replaces the local order. */
  readonly children: readonly CmsFragmentRecord[];
}

export type UseFragmentChildrenResult = CmsFormChildren;

/**
 * @description The `children` bindings for `CoreFormRenderer`: holds the dragged order locally,
 * posts the route's `reorderChildren` intent once per drop (only when the order changed) and
 * `removeChild` on remove, and links each child to its own edit page.
 */
export const useFragmentChildren = (
  options: UseFragmentChildrenOptions,
): UseFragmentChildrenResult => {
  const { addHref, children } = options;

  // Hooks
  const submit = useSubmit();
  const [fragments, setFragments] = React.useState(children);
  const [savedKey, setSavedKey] = React.useState('');

  // Setup
  const childrenKey = children.map((child) => child.uuid).join(',');

  // Re-seed from the loader when the saved order changes (React's "adjust state on prop change").
  if (savedKey !== childrenKey) {
    setSavedKey(childrenKey);
    setFragments(children);
  }

  // Handlers
  const getFragmentHref = (fragment: CmsFragmentRecord): string => {
    return `/fragments/${fragment.uuid}`;
  };

  const onRemove = (fragment: CmsFragmentRecord): void => {
    void submit(
      { childUuid: fragment.uuid, intent: FRAGMENT_INTENT.REMOVE_CHILD },
      { method: 'post' },
    );
  };

  const onReorder = (next: readonly CmsFragmentRecord[]): void => {
    setFragments(next);
  };

  const onDrop = (dropped: readonly CmsFragmentRecord[]): void => {
    const uuids = dropped.map((child) => child.uuid);

    // A drag that ends where it started changes nothing to save.
    if (uuids.join(',') === childrenKey) {
      return;
    }

    void submit(
      {
        childUuids: JSON.stringify(uuids),
        intent: FRAGMENT_INTENT.REORDER_CHILDREN,
      },
      { method: 'post' },
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    addHref,
    fragments,
    getFragmentHref,
    onDrop,
    onRemove,
    onReorder,
  };
};
