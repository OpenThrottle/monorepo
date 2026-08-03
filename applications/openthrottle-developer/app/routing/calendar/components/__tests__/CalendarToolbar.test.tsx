import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CalendarToolbar } from '../CalendarToolbar';
import type { CalendarToolbarProps } from '../CalendarToolbar';

describe('CalendarToolbar Component', () => {
  let component: RenderResult;
  let props: CalendarToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <CalendarToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('CalendarToolbar')).toBeInTheDocument();
  });
});
