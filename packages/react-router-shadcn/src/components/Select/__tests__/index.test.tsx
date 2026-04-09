import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../index';

describe('Select', () => {
  it('should render root', () => {
    const { container } = render(<Select />);
    const root = container.firstElementChild;
    expect(root).toBeInTheDocument();
  });

  it('should render SelectTrigger as button with children', () => {
    const { container } = render(
      <Select>
        <SelectTrigger>Choose</SelectTrigger>
      </Select>,
    );
    const trigger = container.querySelector('button');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Choose');
    expect(trigger).toHaveClass('flex', 'h-10', 'w-full');
  });

  it('should render SelectContent with expected classes', () => {
    const { container } = render(
      <Select>
        <SelectContent>Options</SelectContent>
      </Select>,
    );
    const content = container.querySelector('.relative.z-50');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Options');
  });

  it('should render SelectItem with role option', () => {
    const { container } = render(
      <Select>
        <SelectItem>Option A</SelectItem>
      </Select>,
    );
    const item = container.querySelector('[role="option"]');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('Option A');
  });
});
