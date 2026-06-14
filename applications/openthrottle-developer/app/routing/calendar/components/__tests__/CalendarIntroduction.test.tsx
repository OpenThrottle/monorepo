import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CalendarIntroduction } from '../CalendarIntroduction';
import type { CalendarIntroductionProps } from '../CalendarIntroduction';

describe('CalendarIntroduction Component', () => {
  let component: RenderResult;
  let props: CalendarIntroductionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CalendarIntroduction {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('CalendarIntroduction')).toBeInTheDocument();
  });
});
