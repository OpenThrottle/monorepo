import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import Tags from '../tags._index';

describe('routes/tags._index.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([{ Component: Tags, path: '/tags' }]);
    const component = render(<Stub initialEntries={['/tags']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
