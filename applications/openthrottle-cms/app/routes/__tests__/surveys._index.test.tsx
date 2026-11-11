import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import Surveys from '../surveys._index';

describe('routes/surveys._index.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([{ Component: Surveys, path: '/surveys' }]);
    const component = render(<Stub initialEntries={['/surveys']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
