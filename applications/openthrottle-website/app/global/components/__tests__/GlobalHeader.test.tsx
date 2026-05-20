import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OPEN_THROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';
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

  test('renders logo home link and GitHub nav link', () => {
    expect(component.getByRole('navigation')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /OpenThrottle/i }),
    ).toHaveAttribute('href', '/');
    expect(component.getByRole('link', { name: '' })).toHaveAttribute(
      'href',
      OPEN_THROTTLE_GITHUB_URL,
    );
  });
});
