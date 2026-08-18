import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeComposerDock } from '../HomeComposerDock';
import type { HomeComposerDockProps } from '../HomeComposerDock';

const renderDock = (props: HomeComposerDockProps): RenderResult => {
  const Component = (): React.ReactElement => <HomeComposerDock {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('HomeComposerDock Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderDock({ children: <p>composer</p> });
  });

  test('renders its children', () => {
    expect(component.getByText('composer')).toBeInTheDocument();
  });

  // jsdom computes no sticky geometry, so assert the contract that produces it:
  // sticky against the page scroll container, above the thread, opaque, and
  // clear of the iOS home indicator (the app ships `viewport-fit=cover`).
  test('pins to the bottom of the scroll container on every breakpoint', () => {
    const dock = component.getByTestId('HomeComposerDock');

    expect(dock).toHaveClass('sticky');
    expect(dock).toHaveClass('bottom-0');
    expect(dock).toHaveClass('z-10');
    expect(dock).toHaveClass('bg-background');
    expect(dock).toHaveClass('pb-[env(safe-area-inset-bottom)]');

    // No `md:` gate — the mobile decision was to dock at all widths.
    expect(dock.className).not.toMatch(/md:sticky/);
  });

  test('never uses fixed positioning, which would fight the iOS keyboard', () => {
    expect(component.getByTestId('HomeComposerDock').className).not.toMatch(
      /(^|\s)fixed(\s|$)/,
    );
  });

  test('renders a decorative fade that cannot capture pointer events', () => {
    const fade = component
      .getByTestId('HomeComposerDock')
      .querySelector('[aria-hidden="true"]');

    expect(fade).not.toBeNull();
    expect(fade).toHaveClass('pointer-events-none');
  });

  test('merges a caller className onto the dock', () => {
    component.unmount();
    component = renderDock({ children: <p>composer</p>, className: 'mt-2' });

    expect(component.getByTestId('HomeComposerDock')).toHaveClass('mt-2');
  });
});
