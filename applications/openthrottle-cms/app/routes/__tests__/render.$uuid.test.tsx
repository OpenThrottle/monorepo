import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import RenderUuid from '../render.$uuid';

describe('routes/render.$uuid.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: RenderUuid, path: '/render/:uuid' },
    ]);
    const component = render(<Stub initialEntries={['/render/test-uuid']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
