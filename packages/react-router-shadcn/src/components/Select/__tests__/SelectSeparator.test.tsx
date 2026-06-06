import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../index';
import type { SelectSeparatorProps } from '../SelectSeparator';

describe('SelectSeparator Component', () => {
  let component: RenderResult;
  let props: SelectSeparatorProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <Select open={true}>
        <SelectTrigger aria-label="Choose">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
          <SelectSeparator {...props} />
          <SelectItem value="b">B</SelectItem>
        </SelectContent>
      </Select>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders select separator inside open select', () => {
    expect(component.getByRole('option', { name: 'A' })).toBeInTheDocument();
  });
});
