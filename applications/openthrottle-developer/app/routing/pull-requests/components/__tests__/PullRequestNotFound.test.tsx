import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestNotFound } from '../PullRequestNotFound';
import type { PullRequestNotFoundProps } from '../PullRequestNotFound';

describe('PullRequestNotFound Component', () => {
  let component: RenderResult;
  let props: PullRequestNotFoundProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PullRequestNotFound {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
