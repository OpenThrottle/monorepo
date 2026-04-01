import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import {
  OPEN_THROTTLE_GITHUB_URL,
  FEATURE_BETA_PREVIEW,
} from '@openthrottle/react-router-utils';
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

  test('renders navigation and github link', () => {
    expect(component.getByRole('navigation')).toBeInTheDocument();
    expect(component.getByRole('link', { name: /cms/i })).toHaveAttribute(
      'href',
      '/',
    );
    expect(
      component.container.querySelector(`a[href="${OPEN_THROTTLE_GITHUB_URL}"]`),
    ).toBeInTheDocument();
  });

  test('renders marketing nav links only when beta preview is enabled', () => {
    if (FEATURE_BETA_PREVIEW) {
      expect(component.getByRole('link', { name: /overview/i })).toBeInTheDocument();
      expect(component.getByRole('link', { name: /features/i })).toBeInTheDocument();
      expect(component.getByRole('link', { name: /pricing/i })).toBeInTheDocument();
      return;
    }

    expect(component.queryByRole('link', { name: /overview/i })).not.toBeInTheDocument();
    expect(component.queryByRole('link', { name: /features/i })).not.toBeInTheDocument();
    expect(component.queryByRole('link', { name: /pricing/i })).not.toBeInTheDocument();
  });
});
