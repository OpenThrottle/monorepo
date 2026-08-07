import * as React from 'react';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { GLOBAL_METRICS_STAT_CARD_DOCS } from '../../config';
import { GlobalMetricsInfoModal } from '../GlobalMetricsInfoModal';
import type { GlobalMetricsInfoModalProps } from '../GlobalMetricsInfoModal';
import { GlobalMetricsInfoTrigger } from '../GlobalMetricsInfoTrigger';

interface RenderHarnessResult {
  readonly component: RenderResult;
  readonly user: ReturnType<typeof userEvent.setup>;
}

interface RenderHarnessOptions {
  /**
   * @description When false, the {@link GlobalMetricsInfoModal} is not mounted —
   * useful for exercising the trigger's URL handler in isolation, without the
   * dialog's dismiss-on-outside behavior interfering.
   */
  readonly renderModal?: boolean;
}

const renderHarness = (
  modalProps: GlobalMetricsInfoModalProps = {},
  initialEntries: readonly string[] = ['/'],
  options: RenderHarnessOptions = {},
): RenderHarnessResult => {
  const { renderModal = true } = options;
  const Component = (): React.ReactElement => {
    const [searchParams] = useSearchParams();

    return (
      <div>
        <span data-testid="current-search">{searchParams.toString()}</span>
        <GlobalMetricsInfoTrigger />
        {renderModal ? <GlobalMetricsInfoModal {...modalProps} /> : null}
      </div>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  const user = userEvent.setup();

  const component = render(<RoutesStub initialEntries={[...initialEntries]} />);

  return { component, user };
};

describe('GlobalMetricsInfoModal Component', () => {
  afterEach(() => {
    cleanup();
  });

  describe('when the URL has no modal param', () => {
    beforeEach(() => {
      renderHarness({}, ['/']);
    });

    test('does not render the dialog content', () => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.queryByText('What you are looking at'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the URL has modal=ServerMetricsInfo', () => {
    beforeEach(() => {
      renderHarness({}, ['/?modal=ServerMetricsInfo']);
    });

    test('renders the dialog content (data-testid=GlobalMetricsInfoModal) in the document', () => {
      expect(screen.getByTestId('GlobalMetricsInfoModal')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('renders the dialog with the heading and intro copy', () => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(
        within(dialog).getByText('What you are looking at'),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText('openthrottle-server'),
      ).toBeInTheDocument();
    });

    test('renders the inline <code>serverMetrics</code> element in the intro copy', () => {
      const dialog = screen.getByRole('dialog');
      const inlineCode = within(dialog).getByText('serverMetrics', {
        selector: 'code',
      });
      expect(inlineCode).toBeInTheDocument();
      expect(inlineCode.tagName).toBe('CODE');
      expect(inlineCode).toHaveTextContent('serverMetrics');
    });

    test('renders all three section headings ("What you are looking at", "Stat cards", "Poll & chart")', () => {
      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getByText('What you are looking at'),
      ).toBeInTheDocument();
      expect(within(dialog).getByText('Stat cards')).toBeInTheDocument();
      expect(within(dialog).getByText('Poll & chart')).toBeInTheDocument();
    });

    test('renders each title and body from GLOBAL_METRICS_STAT_CARD_DOCS', () => {
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText('Stat cards')).toBeInTheDocument();

      for (const doc of GLOBAL_METRICS_STAT_CARD_DOCS) {
        expect(within(dialog).getByText(doc.title)).toBeInTheDocument();
        expect(
          within(dialog).getByText(doc.body, { exact: false }),
        ).toBeInTheDocument();
      }
    });

    test('renders Poll & chart bullets', () => {
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/Poll & chart/)).toBeInTheDocument();
      expect(within(dialog).getByText('Poll interval')).toBeInTheDocument();
      expect(within(dialog).getByText('Metrics over time')).toBeInTheDocument();
    });
  });

  describe('when the URL has modal set to a non-matching value', () => {
    beforeEach(() => {
      renderHarness({}, ['/?modal=SomethingElse']);
    });

    test('does not render the dialog content (exact-match on openValue)', () => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('GlobalMetricsInfoModal'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when definitionsHref is provided', () => {
    test('renders the Settings deep link with the supplied href', () => {
      renderHarness(
        { definitionsHref: '/settings/debug#server-metrics-definitions' },
        ['/?modal=ServerMetricsInfo'],
      );

      const link = screen.getByTestId(
        'GlobalMetricsInfoModal-definitions-link',
      );
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        '/settings/debug#server-metrics-definitions',
      );
      expect(link).toHaveTextContent('Open full definitions in Settings');
    });

    test('wraps the Settings deep link in a bordered footer paragraph', () => {
      renderHarness(
        { definitionsHref: '/settings/debug#server-metrics-definitions' },
        ['/?modal=ServerMetricsInfo'],
      );

      const link = screen.getByTestId(
        'GlobalMetricsInfoModal-definitions-link',
      );
      const footer = link.closest('p');

      expect(footer).not.toBeNull();
      expect(footer?.tagName).toBe('P');
      expect(footer).toHaveClass('border-t');
      expect(footer).toHaveClass('pt-3');
      expect(footer?.textContent).toContain(
        'Open full definitions in Settings',
      );
    });
  });

  describe('when definitionsHref is omitted', () => {
    test('does not render the Settings deep link', () => {
      renderHarness({}, ['/?modal=ServerMetricsInfo']);

      expect(
        screen.queryByTestId('GlobalMetricsInfoModal-definitions-link'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when the trigger button is clicked from a closed state', () => {
    test('updates the URL to include modal=ServerMetricsInfo and opens the dialog', async () => {
      const { user } = renderHarness({}, ['/?keep=value']);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('GlobalMetrics-info-trigger'));

      const qs = new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('modal')).toBe('ServerMetricsInfo');
      expect(qs.get('keep')).toBe('value');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('when the open dialog is closed', () => {
    test('via the close button removes the modal param from the URL', async () => {
      const { user } = renderHarness({}, ['/?modal=ServerMetricsInfo&keep=v']);

      const dialog = screen.getByRole('dialog');
      const closeButton = within(dialog).getByRole('button', {
        name: 'Close',
      });

      await user.click(closeButton);

      const qs = new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.has('modal')).toBe(false);
      expect(qs.get('keep')).toBe('v');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('via the Escape key removes only the modal param and preserves sibling params', async () => {
      const { user } = renderHarness({}, ['/?modal=ServerMetricsInfo&foo=bar']);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      const qs = new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.has('modal')).toBe(false);
      expect(qs.get('foo')).toBe('bar');
    });
  });
});

describe('GlobalMetricsInfoTrigger Component', () => {
  afterEach(() => {
    cleanup();
  });

  describe('accessibility attributes on the trigger button', () => {
    test('exposes the expected aria-label for screen readers', () => {
      const { component } = renderHarness({}, ['/']);

      const trigger = component.getByTestId('GlobalMetrics-info-trigger');

      expect(trigger).toHaveAttribute(
        'aria-label',
        'Metrics interpretation help',
      );
    });

    test('uses a non-submitting button (type="button") to avoid stray form submissions', () => {
      const { component } = renderHarness({}, ['/']);

      const trigger = component.getByTestId('GlobalMetrics-info-trigger');

      expect(trigger.tagName).toBe('BUTTON');
      expect(trigger).toHaveAttribute('type', 'button');
    });
  });

  describe('when the trigger is clicked from a URL with no params', () => {
    test('updates the URL to include modal=ServerMetricsInfo', async () => {
      const { component, user } = renderHarness({}, ['/']);

      const currentSearch = component.getByTestId('current-search');
      expect(currentSearch.textContent).toBe('');

      await user.click(component.getByTestId('GlobalMetrics-info-trigger'));

      await waitFor(() => {
        const qs = new URLSearchParams(currentSearch.textContent ?? '');
        expect(qs.get('modal')).toBe('ServerMetricsInfo');
      });
    });
  });

  describe('when the trigger is clicked from a URL with unrelated params', () => {
    test('appends modal=ServerMetricsInfo without clobbering existing params', async () => {
      const { component, user } = renderHarness({}, ['/?foo=bar']);

      const currentSearch = component.getByTestId('current-search');
      expect(currentSearch.textContent).toBe('foo=bar');

      await user.click(component.getByTestId('GlobalMetrics-info-trigger'));

      await waitFor(() => {
        const qs = new URLSearchParams(currentSearch.textContent ?? '');
        expect(qs.get('modal')).toBe('ServerMetricsInfo');
        expect(qs.get('foo')).toBe('bar');
      });
    });
  });

  describe('when the trigger is clicked while modal=ServerMetricsInfo is already set', () => {
    /**
     * @description The trigger's own click handler (`setOpen(true)`) must be a
     * URL no-op when the modal is already open. This renders the trigger in
     * isolation (without {@link GlobalMetricsInfoModal}); with the dialog
     * mounted, clicking the outside trigger fires Radix's dismiss-on-outside
     * behavior, which closes the dialog and is a separate concern from the
     * trigger handler under test here.
     */
    test('the URL params are unchanged (no-op)', async () => {
      const { component, user } = renderHarness(
        {},
        ['/?modal=ServerMetricsInfo&keep=v'],
        { renderModal: false },
      );

      const currentSearch = component.getByTestId('current-search');
      const beforeParams = new URLSearchParams(currentSearch.textContent ?? '');
      expect(beforeParams.get('modal')).toBe('ServerMetricsInfo');
      expect(beforeParams.get('keep')).toBe('v');

      await user.click(component.getByTestId('GlobalMetrics-info-trigger'));

      const afterParams = new URLSearchParams(currentSearch.textContent ?? '');
      expect(afterParams.get('modal')).toBe('ServerMetricsInfo');
      expect(afterParams.get('keep')).toBe('v');
      expect([...afterParams.keys()].sort()).toEqual(
        [...beforeParams.keys()].sort(),
      );
    });
  });
});

describe('GlobalMetricsInfoModal Accessibility', () => {
  afterEach(() => {
    cleanup();
  });

  describe('when the dialog is opened via the URL', () => {
    test('exposes role="dialog" on the Radix content with an accessible name from the title', () => {
      renderHarness({}, ['/?modal=ServerMetricsInfo']);

      const dialog = screen.getByRole('dialog');

      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('role', 'dialog');
      // Radix v1 wires modality via inert siblings rather than aria-modal;
      // assert a connected accessible name instead so screen readers announce
      // the dialog by its title.
      expect(dialog).toHaveAccessibleName('What you are looking at');
    });

    test('moves focus into the dialog (focus is on the dialog or a descendant)', async () => {
      renderHarness({}, ['/?modal=ServerMetricsInfo']);

      const dialog = screen.getByRole('dialog');

      await waitFor(() => {
        const active = document.activeElement;
        expect(active).not.toBeNull();
        expect(dialog === active || dialog.contains(active)).toBe(true);
      });
    });
  });

  describe('when the user presses Escape while the dialog is open', () => {
    test('closes the dialog and removes the modal param from the URL', async () => {
      const { user } = renderHarness({}, ['/?modal=ServerMetricsInfo']);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      const qs = new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.has('modal')).toBe(false);
    });
  });

  describe('close button accessibility', () => {
    test('exposes an accessible name of "Close"', () => {
      renderHarness({}, ['/?modal=ServerMetricsInfo']);

      const dialog = screen.getByRole('dialog');
      const closeButton = within(dialog).getByRole('button', {
        name: 'Close',
      });

      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAccessibleName('Close');
    });

    test('is reachable via the keyboard (focusable, not tabindex="-1")', async () => {
      renderHarness({}, ['/?modal=ServerMetricsInfo']);

      const dialog = screen.getByRole('dialog');
      const closeButton = within(dialog).getByRole('button', {
        name: 'Close',
      });

      expect(closeButton).not.toHaveAttribute('tabindex', '-1');

      closeButton.focus();

      await waitFor(() => {
        expect(closeButton).toHaveFocus();
      });
    });
  });

  describe('keyboard activation of the trigger button', () => {
    test('pressing Enter while the trigger has focus opens the dialog', async () => {
      const { user } = renderHarness({}, ['/']);

      const trigger = screen.getByTestId('GlobalMetrics-info-trigger');
      trigger.focus();
      expect(trigger).toHaveFocus();

      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const qs = new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('modal')).toBe('ServerMetricsInfo');
    });

    test('pressing Space while the trigger has focus opens the dialog', async () => {
      const { user } = renderHarness({}, ['/']);

      const trigger = screen.getByTestId('GlobalMetrics-info-trigger');
      trigger.focus();
      expect(trigger).toHaveFocus();

      await user.keyboard(' ');

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const qs = new URLSearchParams(
        screen.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('modal')).toBe('ServerMetricsInfo');
    });
  });

  describe('focus restoration after the dialog closes', () => {
    /**
     * @description The URL-driven open pattern does not use `<DialogTrigger>`,
     * so Radix Dialog's built-in trigger-ref restoration is a no-op (it
     * prevents focus-scope default and then calls `triggerRef.current?.focus()`
     * which is null). Verify the achievable contract: after closing, focus is
     * no longer trapped inside the (now-removed) dialog content and the
     * trigger remains in the DOM and is programmatically focusable so the
     * user can re-engage it.
     */
    test('removes focus trap and leaves the trigger focusable after closing via Escape', async () => {
      const { user } = renderHarness({}, ['/?modal=ServerMetricsInfo']);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // The previously-focused content (the close button inside the dialog)
      // is no longer the active element.
      expect(document.activeElement).not.toBe(dialog);
      expect(dialog.contains(document.activeElement)).toBe(false);

      // The trigger is still mounted and accepts focus.
      const trigger = screen.getByTestId('GlobalMetrics-info-trigger');
      expect(trigger).toBeInTheDocument();
      trigger.focus();
      expect(trigger).toHaveFocus();
    });
  });
});
