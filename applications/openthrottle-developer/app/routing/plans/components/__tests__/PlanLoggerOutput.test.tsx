import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanLoggerOutput } from '../PlanLoggerOutput';
import type { PlanLoggerOutputProps } from '../PlanLoggerOutput';

describe('PlanLoggerOutput Component', () => {
  let component: RenderResult;
  let props: PlanLoggerOutputProps;

  beforeEach(() => {
    props = { chunks: [] };

    const Component = () => <PlanLoggerOutput {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render empty-state copy when there are no chunks', () => {
    expect(
      component.getByText(/No plan output chunks yet/i),
    ).toBeInTheDocument();
  });
});
