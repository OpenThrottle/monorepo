import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ToggleGroup } from '../ToggleGroup';
import type { ToggleGroupProps } from '../ToggleGroup';
import { ToggleGroupItem } from '../ToggleGroupItem';

const COLLAPSING_CLASSES = [
  '[&>*:not(:first-child)]:rounded-l-none',
  '[&>*:not(:first-child)]:border-l-0',
  '[&>*:not(:last-child)]:rounded-r-none',
];

const renderGroup = (props: ToggleGroupProps): RenderResult => {
  const Component = () => (
    <ToggleGroup {...props}>
      <ToggleGroupItem value="a">A</ToggleGroupItem>
      <ToggleGroupItem value="b">B</ToggleGroupItem>
      <ToggleGroupItem value="c">C</ToggleGroupItem>
    </ToggleGroup>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

const getRoot = (component: RenderResult): Element => {
  const root = component.container.querySelector('[aria-label="Test group"]');

  if (root === null) {
    throw new Error('ToggleGroup root not found');
  }

  return root;
};

describe('ToggleGroup Component', () => {
  let component: RenderResult;
  let props: ToggleGroupProps;

  beforeEach(() => {
    props = { 'aria-label': 'Test group', type: 'single' };

    component = renderGroup(props);
  });

  test('renders toggle group with an item', () => {
    const button = component.container.querySelector('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('A');
  });

  test('stays spaced and uncollapsed by default', () => {
    const root = getRoot(component);

    expect(root).toHaveClass('flex', 'items-center', 'gap-1');
    expect(root).not.toHaveClass('gap-0');

    COLLAPSING_CLASSES.forEach((className) => {
      expect(root).not.toHaveClass(className);
    });
  });
});

describe('ToggleGroup Component — attached', () => {
  let component: RenderResult;
  let props: ToggleGroupProps;

  beforeEach(() => {
    props = { 'aria-label': 'Test group', attached: true, type: 'single' };

    component = renderGroup(props);
  });

  test('collapses the seams between items', () => {
    const root = getRoot(component);

    expect(root).toHaveClass('flex', 'items-center', 'gap-0');
    expect(root).not.toHaveClass('gap-1');

    COLLAPSING_CLASSES.forEach((className) => {
      expect(root).toHaveClass(className);
    });
  });

  test('raises focus rings so a neighbour cannot clip them', () => {
    const root = getRoot(component);

    expect(root).toHaveClass(
      '[&>*]:focus-visible:relative',
      '[&>*]:focus-visible:z-10',
    );
  });

  test('keeps single-select behavior', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();

    component.unmount();
    component = renderGroup({ ...props, onValueChange });

    const buttons = component.container.querySelectorAll('button');
    await user.click(buttons[1]);

    expect(onValueChange).toHaveBeenCalledWith('b');
    expect(buttons[1]).toHaveAttribute('data-state', 'on');
    expect(buttons[0]).toHaveAttribute('data-state', 'off');
  });

  test('keeps keyboard arrow navigation across items', async () => {
    const user = userEvent.setup();
    const buttons = component.container.querySelectorAll('button');

    await user.tab();
    expect(buttons[0]).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(buttons[1]).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(buttons[2]).toHaveFocus();
  });

  test('lets a consumer className win', () => {
    component.unmount();
    component = renderGroup({ ...props, className: 'gap-4 w-full' });

    const root = getRoot(component);

    expect(root).toHaveClass('gap-4', 'w-full');
    expect(root).not.toHaveClass('gap-0');
    expect(root).toHaveClass(COLLAPSING_CLASSES[0]);
  });
});
