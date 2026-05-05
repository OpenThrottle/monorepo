import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PullRequestsTable } from '../PullRequestsTable';
import type { PullRequestsTableProps } from '../PullRequestsTable';

describe('PullRequestsTable Component', () => {
  let component: RenderResult;
  let props: PullRequestsTableProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PullRequestsTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
