import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../index';
import type { SelectLabelProps } from '../SelectLabel';

describe('SelectLabel Component', () => {
  let props: SelectLabelProps;

  beforeEach(() => {
    props = {};
  });

  test('should render label inside SelectGroup when Select is open', () => {
    const Component = () => (
      <Select defaultOpen={true}>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel {...props}>Group label</SelectLabel>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    const label = document.body.querySelector('.font-semibold');
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent('Group label');
  });
});
