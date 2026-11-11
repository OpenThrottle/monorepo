import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import SurveysUuid from '../surveys.$uuid';

describe('routes/surveys.$uuid.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: SurveysUuid, path: '/surveys/:uuid' },
    ]);
    const component = render(<Stub initialEntries={['/surveys/test-uuid']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
