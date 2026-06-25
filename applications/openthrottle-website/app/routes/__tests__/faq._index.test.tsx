import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Component from '../faq._index';

describe('routes/faq._index.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([{ Component, path: '/faq' }]);

    component = render(<RoutesStub initialEntries={['/faq']} />);
  });

  test('renders the FAQ heading and questions from docs-content', () => {
    expect(
      component.getByRole('heading', {
        level: 1,
        name: 'Frequently asked questions',
      }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'What is OpenThrottle?' }),
    ).toBeInTheDocument();
  });
});
