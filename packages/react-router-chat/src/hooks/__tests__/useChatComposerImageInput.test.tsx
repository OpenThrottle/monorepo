import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { dispatchFileEvent } from '../../__tests__/dispatchFileEvent';
import type { UseChatComposerImageInputOptions } from '../useChatComposerImageInput';
import { useChatComposerImageInput } from '../useChatComposerImageInput';

const png = new File(['x'], 'a.png', { type: 'image/png' });

const Harness = (
  props: UseChatComposerImageInputOptions,
): React.ReactElement => {
  const input = useChatComposerImageInput(props);

  return (
    <div
      data-dragging={input.isDragging}
      data-testid="zone"
      onDragLeave={input.onDragLeave}
      onDragOver={input.onDragOver}
      onDrop={input.onDrop}
      onPaste={input.onPaste}
    />
  );
};

describe('useChatComposerImageInput', () => {
  test('tracks dragging while files hover and clears it on leave', () => {
    const component = render(<Harness disabled={false} onAddFiles={vi.fn()} />);
    const zone = component.getByTestId('zone');

    dispatchFileEvent(zone, 'dragover', []);
    expect(zone).toHaveAttribute('data-dragging', 'true');

    dispatchFileEvent(zone, 'dragleave', []);
    expect(zone).toHaveAttribute('data-dragging', 'false');
  });

  test('onDrop adds the dropped images and stops dragging', () => {
    const onAddFiles = vi.fn();
    const component = render(
      <Harness disabled={false} onAddFiles={onAddFiles} />,
    );
    const zone = component.getByTestId('zone');

    dispatchFileEvent(zone, 'dragover', []);
    dispatchFileEvent(zone, 'drop', [png]);

    expect(onAddFiles).toHaveBeenCalledWith([png]);
    expect(zone).toHaveAttribute('data-dragging', 'false');
  });

  test('never highlights or adds while disabled', () => {
    const onAddFiles = vi.fn();
    const component = render(
      <Harness disabled={true} onAddFiles={onAddFiles} />,
    );
    const zone = component.getByTestId('zone');

    dispatchFileEvent(zone, 'dragover', []);
    dispatchFileEvent(zone, 'drop', [png]);

    expect(zone).toHaveAttribute('data-dragging', 'false');
    expect(onAddFiles).not.toHaveBeenCalled();
  });

  test('does nothing without an onAddFiles callback', () => {
    const component = render(
      <Harness disabled={false} onAddFiles={undefined} />,
    );

    const event = dispatchFileEvent(component.getByTestId('zone'), 'paste', [
      png,
    ]);

    expect(event.defaultPrevented).toBe(false);
  });
});
