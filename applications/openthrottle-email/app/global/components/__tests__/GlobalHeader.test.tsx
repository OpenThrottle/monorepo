import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalHeader } from '../GlobalHeader';
import type { GlobalHeaderProps } from '../GlobalHeader';

describe('GlobalHeader Component', () => {
  let component: RenderResult;
  let props: GlobalHeaderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalHeader {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders brand and key navigation links', () => {
    expect(component.getByRole('navigation')).toBeInTheDocument();
    expect(component.getByRole('link', { name: /email/i })).toHaveAttribute(
      'href',
      '/mail/',
    );
    expect(component.getByRole('link', { name: /inbox/i })).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /compose/i }),
    ).toBeInTheDocument();
  });
});
