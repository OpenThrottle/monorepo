import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import TagsCreate from '../tags.create';

describe('routes/tags.create.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: TagsCreate, path: '/tags/create' },
    ]);
    const component = render(<Stub initialEntries={['/tags/create']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
