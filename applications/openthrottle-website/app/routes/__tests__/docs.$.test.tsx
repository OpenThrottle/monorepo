import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Component from '../docs.$';

describe('routes/docs.$.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    const RoutesStub = createRoutesStub([{ Component, path: '/docs/*' }]);

    component = render(
      <RoutesStub initialEntries={['/docs/getting-started']} />,
    );
  });

  test('renders the doc page matching the splat path', () => {
    expect(
      component.getByRole('heading', { level: 1, name: 'Getting Started' }),
    ).toBeInTheDocument();
  });
});
