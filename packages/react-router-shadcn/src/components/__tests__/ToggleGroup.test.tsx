import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToggleGroup, ToggleGroupItem } from '../ToggleGroup';

describe('ToggleGroup', () => {
  it('should render root with type single', () => {
    const { container } = render(
      <ToggleGroup aria-label="Test group" type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );
    const root = container.firstElementChild;
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute('aria-label', 'Test group');
    expect(root).toHaveClass('flex', 'items-center', 'gap-1');
  });

  it('should render root with type multiple', () => {
    const { container } = render(
      <ToggleGroup aria-label="Multi group" type="multiple">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>,
    );
    const root = container.firstElementChild;
    expect(root).toBeInTheDocument();
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent('A');
    expect(buttons[1]).toHaveTextContent('B');
  });

  it('should render items with default styles', () => {
    const { container } = render(
      <ToggleGroup aria-label="Group" type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-state');
    expect(button).toHaveClass(
      'inline-flex',
      'items-center',
      'justify-center',
      'rounded-md',
    );
  });

  it('should support size and variant on root', () => {
    const { container } = render(
      <ToggleGroup aria-label="Group" size="sm" type="single" variant="outline">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
      </ToggleGroup>,
    );
    const button = container.querySelector('button');
    expect(button).toHaveClass('h-9', 'px-2.5', 'border', 'border-input');
  });

  it('should toggle item state on click (single)', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ToggleGroup aria-label="Group" type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>,
    );
    const [btnA, btnB] = container.querySelectorAll('button');
    expect(btnA).toHaveAttribute('data-state', 'off');
    expect(btnB).toHaveAttribute('data-state', 'off');
    await user.click(btnA);
    expect(btnA).toHaveAttribute('data-state', 'on');
    expect(btnB).toHaveAttribute('data-state', 'off');
    await user.click(btnB);
    expect(btnA).toHaveAttribute('data-state', 'off');
    expect(btnB).toHaveAttribute('data-state', 'on');
  });

  it('should allow multiple selection when type is multiple', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ToggleGroup aria-label="Group" type="multiple">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>,
    );
    const [btnA, btnB] = container.querySelectorAll('button');
    await user.click(btnA);
    await user.click(btnB);
    expect(btnA).toHaveAttribute('data-state', 'on');
    expect(btnB).toHaveAttribute('data-state', 'on');
  });
});
