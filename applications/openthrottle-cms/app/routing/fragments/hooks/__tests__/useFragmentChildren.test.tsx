import type { CmsFragmentRecord } from '@openthrottle/react-router-cms-core';
import { act, render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { FRAGMENT_INTENT } from '~/routing/fragments/data/data.intents';
import { MOCK_CONTAINER_EDITOR_RECORDS } from '~/routing/fragments/data/mock.fragment-editor';

import type { UseFragmentChildrenResult } from '../useFragmentChildren';
import { useFragmentChildren } from '../useFragmentChildren';

const CHILDREN = MOCK_CONTAINER_EDITOR_RECORDS.children;

const renderBindings = (children: readonly CmsFragmentRecord[]) => {
  const submitted: FormData[] = [];
  const current: { bindings: UseFragmentChildrenResult | undefined } = {
    bindings: undefined,
  };
  const Component = () => {
    current.bindings = useFragmentChildren({ addHref: '#add', children });
    return null;
  };
  const action = async (args: { readonly request: Request }) => {
    submitted.push(await args.request.formData());
    return null;
  };
  const RoutesStub = createRoutesStub([{ Component, action, path: '/' }]);

  render(<RoutesStub />);

  return { current, submitted };
};

describe('useFragmentChildren', () => {
  test('starts from the saved children and links each to its edit page', async () => {
    const { current } = renderBindings(CHILDREN);

    await waitFor(() => {
      expect(current.bindings?.fragments).toEqual(CHILDREN);
    });
    const [first] = CHILDREN;

    if (!first) throw new Error('mock has no children');
    expect(current.bindings?.addHref).toBe('#add');
    expect(current.bindings?.getFragmentHref(first)).toBe('/fragments/child-1');
  });

  test('applies each swap at once and saves once on drop', async () => {
    const { current, submitted } = renderBindings(CHILDREN);
    const reversed = [...CHILDREN].reverse();

    await waitFor(() => {
      expect(current.bindings).toBeDefined();
    });
    act(() => {
      current.bindings?.onReorder(reversed);
      current.bindings?.onReorder(CHILDREN);
      current.bindings?.onReorder(reversed);
    });

    expect(current.bindings?.fragments).toEqual(reversed);
    expect(submitted).toHaveLength(0);

    act(() => {
      current.bindings?.onDrop?.(reversed);
    });

    await waitFor(() => {
      expect(submitted).toHaveLength(1);
    });
    expect(submitted[0]?.get('intent')).toBe(FRAGMENT_INTENT.REORDER_CHILDREN);
    expect(submitted[0]?.get('childUuids')).toBe('["child-2","child-1"]');
  });

  test('saves nothing for a drop that left the order unchanged', async () => {
    const { current, submitted } = renderBindings(CHILDREN);

    await waitFor(() => {
      expect(current.bindings).toBeDefined();
    });
    act(() => {
      current.bindings?.onDrop?.(CHILDREN);
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(submitted).toHaveLength(0);
  });
});
