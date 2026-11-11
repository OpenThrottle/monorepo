import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import Editor from '../editor';

describe('routes/editor.tsx', () => {
  test('renders the matched child route through its outlet', async () => {
    const Stub = createRoutesStub([
      {
        Component: Editor,
        children: [
          {
            Component: () => <h1>Child route</h1>,
            index: true,
          },
        ],
        path: '/editor',
      },
    ]);
    const component = render(<Stub initialEntries={['/editor']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
