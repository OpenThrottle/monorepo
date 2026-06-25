import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Component from '../docs._index';

describe('routes/docs._index.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([{ Component, path: '/docs' }]);

    component = render(<RoutesStub initialEntries={['/docs']} />);
  });

  test('renders the docs index page from docs-content/docs/index.md', () => {
    expect(
      component.getByRole('heading', { level: 1, name: 'Documentation' }),
    ).toBeInTheDocument();
  });
});
