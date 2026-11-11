import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import EditorUuid from '../editor.$uuid';

describe('routes/editor.$uuid.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: EditorUuid, path: '/editor/:uuid' },
    ]);
    const component = render(<Stub initialEntries={['/editor/test-uuid']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
