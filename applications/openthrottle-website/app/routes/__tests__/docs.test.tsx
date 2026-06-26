import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Component from '../docs';

describe('routes/docs.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([{ Component, path: '/docs' }]);

    component = render(<RoutesStub initialEntries={['/docs']} />);
  });

  test('renders the docs sidebar nav from docs-content', () => {
    expect(
      component.getByRole('navigation', { name: 'Documentation' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Getting Started' }),
    ).toHaveAttribute('href', '/docs/getting-started');
  });
});
