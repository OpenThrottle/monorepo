import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalFooter } from '../GlobalFooter';
import type { GlobalFooterProps } from '../GlobalFooter';

describe('GlobalFooter Component', () => {
  let component: RenderResult;
  let props: GlobalFooterProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalFooter {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders brand, tagline, and legal links', () => {
    expect(component.getByTestId('GlobalFooter')).toBeInTheDocument();
    expect(component.getByRole('contentinfo')).toBeInTheDocument();
    expect(component.getByText('OpenThrottle')).toBeInTheDocument();
    expect(
      component.getByText('Context-driven AI for developers.'),
    ).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/legal/privacy-policy',
    );
    expect(component.getByRole('link', { name: 'Terms' })).toHaveAttribute(
      'href',
      '/legal/terms-of-use',
    );
  });
});
