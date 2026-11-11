import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import SchemasUuid from '../schemas.$uuid._index';

describe('routes/schemas.$uuid._index.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: SchemasUuid, path: '/schemas/:uuid' },
    ]);
    const component = render(<Stub initialEntries={['/schemas/test-uuid']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
