import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { MOCK_EDITOR_DRAFT } from '~/routing/blog/data/mock.blog-posts';
import { toBlogPostEditorValues } from '~/routing/blog/utils/editor-values';

import { useBlogPostSave } from '../useBlogPostSave';

const Probe = (): React.ReactElement => {
  const values = {
    ...toBlogPostEditorValues(MOCK_EDITOR_DRAFT),
    excerpt: '',
    tagSlugs: ['releases'],
  };
  const { overwrite, result, save } = useBlogPostSave({
    post: MOCK_EDITOR_DRAFT,
    values,
  });

  return (
    <>
      <button onClick={save} type="button">
        save
      </button>
      <button onClick={overwrite} type="button">
        overwrite
      </button>
      <p>outcome: {result?.outcome ?? 'none'}</p>
    </>
  );
};

describe('useBlogPostSave', () => {
  test('posts the diff as JSON and exposes the typed result', async () => {
    const bodies: unknown[] = [];
    const Stub = createRoutesStub([
      {
        Component: Probe,
        action: async ({ request }: { readonly request: Request }) => {
          bodies.push(await request.json());

          return { outcome: 'saved' };
        },
        path: '/',
      },
    ]);
    const component = render(<Stub />);
    const user = userEvent.setup();

    await user.click(component.getByRole('button', { name: 'save' }));
    expect(await component.findByText('outcome: saved')).toBeInTheDocument();

    await user.click(component.getByRole('button', { name: 'overwrite' }));
    await waitFor(() => expect(bodies).toHaveLength(2));

    expect(bodies).toEqual([
      {
        changes: { excerpt: null },
        expectedUpdatedAt: MOCK_EDITOR_DRAFT.updatedAt,
        intent: 'save',
        tagSlugs: ['releases'],
      },
      {
        changes: { excerpt: null },
        expectedUpdatedAt: MOCK_EDITOR_DRAFT.updatedAt,
        intent: 'overwrite',
        tagSlugs: ['releases'],
      },
    ]);
  });
});
