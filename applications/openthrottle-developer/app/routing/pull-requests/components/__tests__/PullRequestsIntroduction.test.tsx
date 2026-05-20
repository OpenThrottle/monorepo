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

  test('renders title and supporting copy', () => {
    expect(
      component.getByRole('heading', { level: 1, name: 'Pull requests' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        'Open a pull request to browse commits, checks, and conversation.',
      ),
    ).toBeInTheDocument();
  });
});
