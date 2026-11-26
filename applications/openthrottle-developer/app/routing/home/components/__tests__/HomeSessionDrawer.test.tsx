import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { HomeSessionDrawerProps } from '../HomeSessionDrawer';
import { HomeSessionDrawer } from '../HomeSessionDrawer';

describe('HomeSessionDrawer Component', () => {
  let component: RenderResult;
  let props: HomeSessionDrawerProps;

  const renderDrawer = (overrides: Partial<HomeSessionDrawerProps>): void => {
    component?.unmount();
    props = {
      changes: {
        diff: undefined,
        isLoading: false,
        isPatchTruncated: false,
        onRefresh: vi.fn(),
        onSelectFile: vi.fn(),
        selectedFile: undefined,
        selectedPatch: undefined,
      },
      collapsedSections: [],
      environment: undefined,
      isOpen: false,
      isSheetOpen: false,
      isStreaming: false,
      messages: [],
      onSheetOpenChange: vi.fn(),
      onToggleOpen: vi.fn(),
      onToggleSection: vi.fn(),
      queuedMessages: undefined,
      ...overrides,
    };
    component = render(<HomeSessionDrawer {...props} />);
  };

  beforeEach(() => {
    renderDrawer({});
  });

  describe('when closed', () => {
    test('shows only the rail, in the closed slot', () => {
      expect(component.getByTestId('HomeSessionDrawer-slot')).toHaveAttribute(
        'data-state',
        'closed',
      );
      expect(
        component.getByTestId('HomeSessionDrawer-show'),
      ).toBeInTheDocument();
      expect(component.queryByTestId('ChatSessionDrawer')).toBeNull();
    });

    test('clicking the rail opens it', async () => {
      await userEvent.click(component.getByTestId('HomeSessionDrawer-rail'));

      expect(props.onToggleOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('when open', () => {
    beforeEach(() => {
      renderDrawer({ isOpen: true });
    });

    test('renders the session panel in the open slot', () => {
      expect(component.getByTestId('HomeSessionDrawer-slot')).toHaveAttribute(
        'data-state',
        'open',
      );
      expect(component.getByTestId('ChatSessionDrawer')).toBeInTheDocument();
    });

    test('the panel close button closes it', async () => {
      await userEvent.click(component.getByTestId('ChatSessionDrawer-close'));

      expect(props.onToggleOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe('sheet', () => {
    test('renders the panel in a sheet when open', () => {
      renderDrawer({ isSheetOpen: true });

      expect(
        component.getByTestId('HomeSessionDrawer-sheet'),
      ).toBeInTheDocument();
    });

    test('is absent while closed', () => {
      expect(component.queryByTestId('HomeSessionDrawer-sheet')).toBeNull();
    });
  });
});
