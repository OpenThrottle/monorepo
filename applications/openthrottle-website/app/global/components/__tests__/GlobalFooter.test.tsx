import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GLOBAL_FOOTER_SPONSOR_COPY } from '../../data/data.copy';
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

  test('renders brand and tagline', () => {
    expect(component.getByTestId('GlobalFooter')).toBeInTheDocument();
    expect(component.getByRole('contentinfo')).toBeInTheDocument();
    expect(component.getByText('Open')).toBeInTheDocument();
    expect(component.getByText('Throttle')).toBeInTheDocument();
    expect(
      component.getByText(
        'Context-driven AI tools and workflows for the Agentic Developer.',
      ),
    ).toBeInTheDocument();
    expect(component.getByText('Open source')).toBeInTheDocument();
  });

  test('links to the public sponsors page', () => {
    const link = component.getByRole('link', {
      name: GLOBAL_FOOTER_SPONSOR_COPY.label,
    });

    expect(link).toHaveAttribute('href', GLOBAL_FOOTER_SPONSOR_COPY.href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(
      component.getByText(GLOBAL_FOOTER_SPONSOR_COPY.prompt),
    ).toBeInTheDocument();
  });
});
