import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestsIntroduction } from '../PullRequestsIntroduction';
import type { PullRequestsIntroductionProps } from '../PullRequestsIntroduction';

describe('PullRequestsIntroduction Component', () => {
  let component: RenderResult;
  let props: PullRequestsIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PullRequestsIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
