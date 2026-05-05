import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestsStats } from '../PullRequestsStats';
import type { PullRequestsStatsProps } from '../PullRequestsStats';

describe('PullRequestsStats Component', () => {
  let component: RenderResult;
  let props: PullRequestsStatsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PullRequestsStats {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
