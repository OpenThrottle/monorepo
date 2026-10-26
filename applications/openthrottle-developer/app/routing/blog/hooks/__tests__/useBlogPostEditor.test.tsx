import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import {
  MOCK_EDITOR_DRAFT,
  MOCK_EDITOR_LIVE,
} from '~/routing/blog/data/mock.blog-posts';
import type { BlogEditorPost } from '~/routing/blog/types';

import { useBlogPostEditor } from '../useBlogPostEditor';

const Probe = (props: {
  readonly canWrite: boolean;
  readonly post: BlogEditorPost;
}): React.ReactElement => {
  const editor = useBlogPostEditor(props);

  return (
    <p>
      readOnly: {String(editor.isReadOnly)} canSave: {String(editor.canSave)}
    </p>
  );
};

const renderProbe = (canWrite: boolean, post: BlogEditorPost) => {
  const Stub = createRoutesStub([
    // eslint-disable-next-line react/no-multi-comp
    { Component: () => <Probe canWrite={canWrite} post={post} />, path: '/' },
  ]);

  return render(<Stub />);
};

describe('useBlogPostEditor', () => {
  test('a draft is editable without blog:write', () => {
    const component = renderProbe(false, MOCK_EDITOR_DRAFT);

    expect(
      component.getByText('readOnly: false canSave: false'),
    ).toBeInTheDocument();
  });

  test('a live post is read-only without blog:write', () => {
    const component = renderProbe(false, MOCK_EDITOR_LIVE);

    expect(component.getByText(/readOnly: true/)).toBeInTheDocument();
  });

  test('a live post is editable with blog:write', () => {
    const component = renderProbe(true, MOCK_EDITOR_LIVE);

    expect(component.getByText(/readOnly: false/)).toBeInTheDocument();
  });
});
