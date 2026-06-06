import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Select, SelectContent, SelectTrigger, SelectValue } from '../index';
import type { SelectContentProps } from '../SelectContent';

describe('SelectContent Component', () => {
  let props: SelectContentProps;

  beforeEach(() => {
    props = {};
  });

  test('should render content when Select is open', () => {
    const Component = () => (
      <Select defaultOpen={true}>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent {...props}>Options</SelectContent>
      </Select>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    const content = document.body.querySelector('.relative.z-50');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Options');
  });
});
