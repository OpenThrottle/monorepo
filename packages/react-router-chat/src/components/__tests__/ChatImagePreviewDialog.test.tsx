import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@openthrottle/react-router-shadcn';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import { CHAT_IMAGE_PREVIEW_COPY } from '../../data/copy';
import type { ChatMessageAttachment } from '../../types';
import { ChatImagePreviewDialog } from '../ChatImagePreviewDialog';

const make = (id: string, name: string): ChatMessageAttachment => {
  return {
    byteSize: null,
    height: null,
    id,
    mimeType: null,
    originalName: name,
    width: null,
  };
};

const attachments = [make('a', 'one.png'), make('b', 'two.png')];

describe('ChatImagePreviewDialog', () => {
  describe('when closed', () => {
    test('renders nothing', () => {
      const component = render(
        <ChatImagePreviewDialog
          attachments={attachments}
          index={undefined}
          onClose={vi.fn()}
          onIndexChange={vi.fn()}
          openerRef={{ current: null }}
        />,
      );

      expect(component.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('when open', () => {
    test('shows the image, title and an open-original link', () => {
      const component = render(
        <ChatImagePreviewDialog
          attachments={attachments}
          index={0}
          onClose={vi.fn()}
          onIndexChange={vi.fn()}
          openerRef={{ current: null }}
        />,
      );

      expect(
        component.getByRole('dialog', { name: 'one.png' }),
      ).toBeInTheDocument();
      expect(component.getByRole('img', { name: 'one.png' })).toHaveAttribute(
        'src',
        '/resources/attachments/a',
      );
      const link = component.getByRole('link', {
        name: CHAT_IMAGE_PREVIEW_COPY.openOriginal,
      });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('href', '/resources/attachments/a');
    });

    test('closes on Escape', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <ChatImagePreviewDialog
          attachments={attachments}
          index={0}
          onClose={onClose}
          onIndexChange={vi.fn()}
          openerRef={{ current: null }}
        />,
      );

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    test('steps with arrow keys and buttons, wrapping at the ends', async () => {
      const user = userEvent.setup();
      const onIndexChange = vi.fn();
      const component = render(
        <ChatImagePreviewDialog
          attachments={attachments}
          index={1}
          onClose={vi.fn()}
          onIndexChange={onIndexChange}
          openerRef={{ current: null }}
        />,
      );

      await user.keyboard('{ArrowRight}');
      await waitFor(() => {
        expect(onIndexChange).toHaveBeenLastCalledWith(0);
      });
      await user.keyboard('{ArrowLeft}');
      await waitFor(() => {
        expect(onIndexChange).toHaveBeenLastCalledWith(0);
      });
      await user.click(
        component.getByRole('button', {
          name: CHAT_IMAGE_PREVIEW_COPY.previousImage,
        }),
      );
      await waitFor(() => {
        expect(onIndexChange).toHaveBeenCalledTimes(3);
      });
    });

    test('hides navigation for a single image', () => {
      const component = render(
        <ChatImagePreviewDialog
          attachments={[make('a', 'one.png')]}
          index={0}
          onClose={vi.fn()}
          onIndexChange={vi.fn()}
          openerRef={{ current: null }}
        />,
      );

      expect(
        component.queryByRole('button', {
          name: CHAT_IMAGE_PREVIEW_COPY.nextImage,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('nested inside an outer dialog', () => {
    test('Esc closes only the preview', async () => {
      const user = userEvent.setup();
      const Harness = (): React.ReactElement => {
        const [index, setIndex] = React.useState<number | undefined>(0);
        return (
          <Dialog open={true}>
            <DialogContent>
              <DialogTitle>Outer</DialogTitle>
              <ChatImagePreviewDialog
                attachments={attachments}
                index={index}
                onClose={() => setIndex(undefined)}
                onIndexChange={setIndex}
                openerRef={{ current: null }}
              />
            </DialogContent>
          </Dialog>
        );
      };
      const component = render(<Harness />);
      expect(component.getByRole('dialog', { name: 'one.png' })).toBeVisible();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(component.queryByRole('dialog', { name: 'one.png' })).toBeNull();
      });
      expect(component.getByRole('dialog', { name: 'Outer' })).toBeVisible();
    });
  });
});
