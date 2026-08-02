import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CalendarEmpty } from '../CalendarEmpty';
import type { CalendarEmptyProps } from '../CalendarEmpty';

describe('CalendarEmpty Component', () => {
  let component: RenderResult;
  let props: CalendarEmptyProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CalendarEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('CalendarEmpty')).toBeInTheDocument();
  });
});
