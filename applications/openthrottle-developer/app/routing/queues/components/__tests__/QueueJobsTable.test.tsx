import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueueJobsTable } from '../QueueJobsTable';
import type { QueueJobsTableProps } from '../QueueJobsTable';

describe('QueueJobsTable Component', () => {
  let component: RenderResult;
  let props: QueueJobsTableProps;

  beforeEach(() => {
    props = {};

    const Component = () => <QueueJobsTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
