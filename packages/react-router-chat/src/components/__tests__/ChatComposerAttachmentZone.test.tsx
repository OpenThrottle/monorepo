import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { dispatchFileEvent } from '../../__tests__/dispatchFileEvent';
import { ChatComposerAttachmentZone } from '../ChatComposerAttachmentZone';

const png = (): File => {
  return new File(['x'], 'shot.png', { type: 'image/png' });
};
const text = (): File => {
  return new File(['x'], 'notes.txt', { type: 'text/plain' });
};

const renderZone = (
  props: Partial<React.ComponentProps<typeof ChatComposerAttachmentZone>>,
) => {
  return render(
    <ChatComposerAttachmentZone disabled={false} {...props}>
      <textarea aria-label="Message" />
    </ChatComposerAttachmentZone>,
  );
};

describe('ChatComposerAttachmentZone', () => {
  test('renders only its children when attachments are not wired', () => {
    const component = renderZone({});

    expect(component.queryByTestId('ChatComposerAttachmentZone')).toBeNull();
    expect(component.getByLabelText('Message')).toBeInTheDocument();
  });

  describe('paste', () => {
    test('hands pasted image files to onAddFiles and swallows the paste', () => {
      const onAddFiles = vi.fn();
      const component = renderZone({ onAddFiles });
      const file = png();

      const event = dispatchFileEvent(
        component.getByLabelText('Message'),
        'paste',
        [file],
      );

      expect(onAddFiles).toHaveBeenCalledWith([file]);
      expect(event.defaultPrevented).toBe(true);
    });

    test('leaves a paste that also carries text alone', () => {
      const onAddFiles = vi.fn();
      const component = renderZone({ onAddFiles });

      const event = dispatchFileEvent(
        component.getByLabelText('Message'),
        'paste',
        [png()],
        'a1\tb1',
      );

      expect(onAddFiles).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    test('ignores non-image files', () => {
      const onAddFiles = vi.fn();
      const component = renderZone({ onAddFiles });

      dispatchFileEvent(component.getByLabelText('Message'), 'paste', [text()]);

      expect(onAddFiles).not.toHaveBeenCalled();
    });

    test('is ignored while attachments are disabled', () => {
      const onAddFiles = vi.fn();
      const component = renderZone({
        attachmentsDisabledReason: 'No image support',
        onAddFiles,
      });

      dispatchFileEvent(component.getByLabelText('Message'), 'paste', [png()]);

      expect(onAddFiles).not.toHaveBeenCalled();
    });
  });

  describe('drop', () => {
    test('hands dropped image files to onAddFiles', () => {
      const onAddFiles = vi.fn();
      const component = renderZone({ onAddFiles });
      const file = png();

      dispatchFileEvent(
        component.getByTestId('ChatComposerAttachmentZone'),
        'drop',
        [file, text()],
      );

      expect(onAddFiles).toHaveBeenCalledWith([file]);
    });

    test('is ignored while the composer is disabled', () => {
      const onAddFiles = vi.fn();
      const component = renderZone({ disabled: true, onAddFiles });

      dispatchFileEvent(
        component.getByTestId('ChatComposerAttachmentZone'),
        'drop',
        [png()],
      );

      expect(onAddFiles).not.toHaveBeenCalled();
    });
  });

  test('renders the chips and removes through onRemoveAttachment', () => {
    const component = renderZone({
      attachments: [
        {
          localId: 'a-1',
          name: 'a.png',
          previewUrl: 'blob:a',
          status: 'ready',
        },
      ],
      onAddFiles: vi.fn(),
    });

    expect(component.getAllByRole('listitem')).toHaveLength(1);
  });
});
