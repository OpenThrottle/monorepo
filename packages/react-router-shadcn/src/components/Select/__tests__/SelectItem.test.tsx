import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../index';
import type { SelectItemProps } from '../SelectItem';

describe('SelectItem Component', () => {
  let props: SelectItemProps;

  beforeEach(() => {
    props = { value: 'a' };
  });

  test('should render item with role option when Select is open', () => {
    const Component = () => (
      <Select defaultOpen={true}>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem {...props}>Option A</SelectItem>
        </SelectContent>
      </Select>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    const item = document.body.querySelector('[role="option"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Option A');
  });
});
