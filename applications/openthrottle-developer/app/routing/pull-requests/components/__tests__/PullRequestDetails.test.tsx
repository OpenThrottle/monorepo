import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestDetails } from '../PullRequestDetails';
import type { PullRequestDetailsProps } from '../PullRequestDetails';

describe('PullRequestDetails Component', () => {
  let component: RenderResult;
  let props: PullRequestDetailsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PullRequestDetails {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
