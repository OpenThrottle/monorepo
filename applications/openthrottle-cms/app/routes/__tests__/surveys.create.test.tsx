import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import SurveysCreate from '../surveys.create';

describe('routes/surveys.create.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: SurveysCreate, path: '/surveys/create' },
    ]);
    const component = render(<Stub initialEntries={['/surveys/create']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
