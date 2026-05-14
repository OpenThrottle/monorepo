import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestsToolbar } from '../PullRequestsToolbar';
import type { PullRequestsToolbarProps } from '../PullRequestsToolbar';

describe('PullRequestsToolbar Component', () => {
  let component: RenderResult;
  let props: PullRequestsToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PullRequestsToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
