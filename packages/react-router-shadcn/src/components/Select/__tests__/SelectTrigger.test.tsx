import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Select, SelectTrigger } from '../index';
import type { SelectTriggerProps } from '../SelectTrigger';

describe('SelectTrigger Component', () => {
  let props: SelectTriggerProps;

  beforeEach(() => {
    props = {};
  });

  test('should render trigger inside Select', () => {
    const Component = () => (
      <Select>
        <SelectTrigger {...props}>Choose</SelectTrigger>
      </Select>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { container } = render(<RoutesStub />);

    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Choose');
    expect(trigger).toHaveClass('flex', 'h-10', 'w-full');
  });
});
