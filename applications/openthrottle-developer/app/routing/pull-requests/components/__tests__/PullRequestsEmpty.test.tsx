import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestsEmpty } from '../PullRequestsEmpty';
import type { PullRequestsEmptyProps } from '../PullRequestsEmpty';

describe('PullRequestsEmpty Component', () => {
  let component: RenderResult;
  let props: PullRequestsEmptyProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PullRequestsEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
