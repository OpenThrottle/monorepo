import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ScheduleIntroduction } from '../ScheduleIntroduction';
import type { ScheduleIntroductionProps } from '../ScheduleIntroduction';

describe('ScheduleIntroduction Component', () => {
  let component: RenderResult;
  let props: ScheduleIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ScheduleIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('ScheduleIntroduction')).toBeInTheDocument();
  });
});
