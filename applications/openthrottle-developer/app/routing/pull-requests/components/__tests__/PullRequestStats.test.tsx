import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestStats } from '../PullRequestStats';
import type { PullRequestStatsProps } from '../PullRequestStats';

describe('PullRequestStats Component', () => {
  let component: RenderResult;
  let props: PullRequestStatsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PullRequestStats {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders stat cards with expected titles and values', () => {
    expect(component.getByTestId('PullRequestStats')).toBeInTheDocument();
    expect(component.getByText('Open / Yours')).toBeInTheDocument();
    expect(component.getByText('23')).toBeInTheDocument();
    expect(component.getByText('21')).toBeInTheDocument();
    expect(component.getByText('Merged / Closed')).toBeInTheDocument();
    expect(component.getByText('100')).toBeInTheDocument();
    expect(component.getByText('85')).toBeInTheDocument();
    expect(component.getByText('All')).toBeInTheDocument();
    expect(component.getByText('123')).toBeInTheDocument();
  });
});
