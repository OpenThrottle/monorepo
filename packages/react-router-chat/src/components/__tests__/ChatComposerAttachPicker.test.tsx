import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { ChatComposerAttachPicker } from '../ChatComposerAttachPicker';

const renderPicker = (
  props: React.ComponentProps<typeof ChatComposerAttachPicker>,
) => {
  return render(
    <TooltipProvider>
      <ChatComposerAttachPicker {...props} />
    </TooltipProvider>,
  );
};

describe('ChatComposerAttachPicker', () => {
  test('picks several images and hands them to onAddFiles', async () => {
    const onAddFiles = vi.fn();
    const component = renderPicker({ disabledReason: undefined, onAddFiles });
    const files = [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.webp', { type: 'image/webp' }),
    ];

    const input = component.getByTestId('ChatComposerAttachPicker-input');
    await userEvent.setup().upload(input, files);

    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveAttribute(
      'accept',
      'image/png,image/jpeg,image/gif,image/webp',
    );
    expect(onAddFiles).toHaveBeenCalledWith(files);
  });

  test('the button opens the native picker', async () => {
    const component = renderPicker({
      disabledReason: undefined,
      onAddFiles: vi.fn(),
    });
    const input = component.getByTestId('ChatComposerAttachPicker-input');
    const click = vi.spyOn(input, 'click');

    await userEvent
      .setup()
      .click(component.getByRole('button', { name: 'Attach images' }));

    expect(click).toHaveBeenCalled();
  });

  test('is disabled and explains why on hover when a reason is set', async () => {
    const component = renderPicker({
      disabledReason: 'This model does not accept images',
      onAddFiles: vi.fn(),
    });

    const button = component.getByRole('button', { name: 'Attach images' });
    expect(button).toBeDisabled();

    await userEvent.setup().hover(button.parentElement ?? button);

    expect(
      await component.findByRole('tooltip', {
        name: 'This model does not accept images',
      }),
    ).toBeInTheDocument();
  });
});
