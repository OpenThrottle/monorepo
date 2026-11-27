import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import type { ChatSessionDrawerSectionsValue } from '../../data/chat-session-drawer-sections';
import { CHAT_SESSION_DRAWER_SECTIONS } from '../../data/chat-session-drawer-sections';
import type { ChatSessionChanges } from '../../types';
import type { ChatSessionDrawerProps } from '../ChatSessionDrawer';
import { ChatSessionDrawer } from '../ChatSessionDrawer';

const onSelectFile = vi.fn();
const CHANGES: ChatSessionChanges = {
  diff: undefined,
  isLoading: false,
  isPatchTruncated: false,
  onCloseFile: vi.fn(),
  onRefresh: vi.fn(),
  onSelectFile,
  selectedFile: undefined,
  selectedPatch: undefined,
};

const renderDrawer = (overrides: Partial<ChatSessionDrawerProps> = {}) => {
  const onClose = vi.fn();
  const onToggleSection = vi.fn();
  const component = render(
    <ChatSessionDrawer
      changes={CHANGES}
      collapsedSections={[]}
      environment={undefined}
      isStreaming={false}
      messages={[]}
      onClose={onClose}
      onToggleSection={onToggleSection}
      queuedMessages={undefined}
      showClose={true}
      {...overrides}
    />,
  );

  return { component, onClose, onToggleSection };
};

const SECTION_IDS: readonly ChatSessionDrawerSectionsValue[] = [
  CHAT_SESSION_DRAWER_SECTIONS.RUNNING,
  CHAT_SESSION_DRAWER_SECTIONS.CONTEXT,
  CHAT_SESSION_DRAWER_SECTIONS.ENVIRONMENT,
  CHAT_SESSION_DRAWER_SECTIONS.CHANGES,
];

describe('ChatSessionDrawer', () => {
  test('renders the four sections', () => {
    const { component } = renderDrawer();

    for (const id of SECTION_IDS) {
      expect(
        component.getByTestId(`ChatSessionDrawerSection-${id}`),
      ).toBeInTheDocument();
    }
  });

  test('a collapsed section hides its body', () => {
    const { component } = renderDrawer({ collapsedSections: ['changes'] });

    expect(component.queryByTestId('ChatSessionDrawerChanges')).toBeNull();
    expect(
      component.getByTestId('ChatSessionDrawerRunning'),
    ).toBeInTheDocument();
  });

  test('toggling a section reports its id', async () => {
    const { component, onToggleSection } = renderDrawer();

    await userEvent.click(
      component.getByTestId('ChatSessionDrawerSection-environment-toggle'),
    );

    expect(onToggleSection).toHaveBeenCalledWith('environment');
  });

  describe('close', () => {
    test('the close button reports onClose', async () => {
      const { component, onClose } = renderDrawer();

      await userEvent.click(component.getByTestId('ChatSessionDrawer-close'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('is omitted when the host supplies its own', () => {
      const { component } = renderDrawer({ showClose: false });

      expect(component.queryByTestId('ChatSessionDrawer-close')).toBeNull();
    });
  });
});
