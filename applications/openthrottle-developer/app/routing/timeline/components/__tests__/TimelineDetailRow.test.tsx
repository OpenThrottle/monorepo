import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TimelineDetailRow } from '../TimelineDetailRow';

describe('TimelineDetailRow Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = () => (
      <TimelineDetailRow label="Duration" value="2h 14m" />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the row', () => {
    expect(component.getByTestId('TimelineDetailRow')).toBeInTheDocument();
  });

  test('should render the label and its value', () => {
    expect(component.getByText('Duration')).toBeVisible();
    expect(component.getByText('2h 14m')).toBeVisible();
  });
});
