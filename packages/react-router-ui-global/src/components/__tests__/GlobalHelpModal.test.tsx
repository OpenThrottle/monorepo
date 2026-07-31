import * as React from 'react';
import { render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import {
  HELP_LINKS,
  HELP_MODAL_COPY,
  HELP_SHORTCUTS,
} from '../../data/data.copy.help';
import { GlobalHelpModal } from '../GlobalHelpModal';
import { GlobalHelpTrigger } from '../GlobalHelpTrigger';
import { GlobalLayoutHeader } from '../GlobalLayoutHeader';
import { GlobalProviders } from '../GlobalProviders';

interface RenderHarnessResult {
  readonly component: RenderResult;
  readonly user: ReturnType<typeof userEvent.setup>;
}

const renderHarness = (
  initialEntries: readonly string[] = ['/'],
): RenderHarnessResult => {
  const Component = (): React.ReactElement => {
    const [searchParams] = useSearchParams();

    return (
      <TooltipProvider>
        <span data-testid="current-search">{searchParams.toString()}</span>
        <GlobalHelpTrigger />
        <GlobalHelpModal />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  const user = userEvent.setup();
  const component = render(<RoutesStub initialEntries={[...initialEntries]} />);

  return { component, user };
};

const renderHeader = (): RenderResult => {
  // eslint-disable-next-line react/no-multi-comp -- test-local harness component
  const Component = (): React.ReactElement => (
    <GlobalProviders>
      <GlobalLayoutHeader />
    </GlobalProviders>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('GlobalHelpTrigger Component', () => {
  test('exposes the "Help and shortcuts" accessible label on a non-submitting button', () => {
    const { component } = renderHarness(['/']);

    const trigger = component.getByTestId('GlobalHelpTrigger');

    expect(trigger).toHaveAttribute('aria-label', 'Help and shortcuts');
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).toHaveAttribute('type', 'button');
  });

  test('clicking sets modal=help in the URL and preserves an unrelated param', async () => {
    const { component, user } = renderHarness(['/?keep=value']);

    expect(component.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(component.getByTestId('GlobalHelpTrigger'));

    await waitFor(() => {
      const qs = new URLSearchParams(
        component.getByTestId('current-search').textContent ?? '',
      );
      expect(qs.get('modal')).toBe('help');
      expect(qs.get('keep')).toBe('value');
    });
    expect(component.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('GlobalHelpModal Component', () => {
  test('does not render the dialog when the modal param is absent', () => {
    const { component } = renderHarness(['/']);

    expect(component.queryByRole('dialog')).not.toBeInTheDocument();
    expect(component.queryByTestId('GlobalHelpModal')).not.toBeInTheDocument();
  });

  test('opens on initial render when the URL already has ?modal=help', () => {
    const { component } = renderHarness(['/?modal=help']);

    const dialog = component.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(component.getByTestId('GlobalHelpModal')).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName(HELP_MODAL_COPY.title);
  });

  test('renders the lead copy, shortcuts, and links from data.copy.help', () => {
    const { component } = renderHarness(['/?modal=help']);

    const dialog = component.getByRole('dialog');

    expect(within(dialog).getByText(HELP_MODAL_COPY.title)).toBeInTheDocument();
    expect(
      within(dialog).getByText(HELP_MODAL_COPY.description),
    ).toBeInTheDocument();

    for (const shortcut of HELP_SHORTCUTS) {
      expect(within(dialog).getByText(shortcut.keys)).toBeInTheDocument();
      expect(
        within(dialog).getByText(shortcut.label, { exact: false }),
      ).toBeInTheDocument();
    }

    for (const link of HELP_LINKS) {
      const anchor = within(dialog).getByRole('link', { name: link.label });
      expect(anchor).toHaveAttribute('href', link.href);
    }
  });

  test('does not open the help dialog for ?modal=ServerMetricsInfo (no key collision)', () => {
    const { component } = renderHarness(['/?modal=ServerMetricsInfo']);

    expect(component.queryByTestId('GlobalHelpModal')).not.toBeInTheDocument();
    expect(component.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('closing via the close button removes only the modal param', async () => {
    const { component, user } = renderHarness(['/?modal=help&keep=v']);

    const dialog = component.getByRole('dialog');
    const closeButton = within(dialog).getByRole('button', { name: 'Close' });

    await user.click(closeButton);

    await waitFor(() => {
      expect(component.queryByRole('dialog')).not.toBeInTheDocument();
    });
    const qs = new URLSearchParams(
      component.getByTestId('current-search').textContent ?? '',
    );
    expect(qs.has('modal')).toBe(false);
    expect(qs.get('keep')).toBe('v');
  });

  test('closing via Escape removes only the modal param and preserves siblings', async () => {
    const { component, user } = renderHarness(['/?modal=help&foo=bar']);

    expect(component.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(component.queryByRole('dialog')).not.toBeInTheDocument();
    });
    const qs = new URLSearchParams(
      component.getByTestId('current-search').textContent ?? '',
    );
    expect(qs.has('modal')).toBe(false);
    expect(qs.get('foo')).toBe('bar');
  });
});

describe('GlobalLayoutHeader help trigger wiring', () => {
  test('renders the help trigger by accessible label inside the nav', () => {
    const component = renderHeader();

    const nav = component.getByTestId('global-layout-nav');
    const trigger = within(nav).getByRole('button', {
      name: 'Help and shortcuts',
    });

    expect(trigger).toBeInTheDocument();
    expect(within(nav).getByTestId('GlobalHelpTrigger')).toBe(trigger);
  });

  test('keeps the existing header chrome (sidebar toggle + searchbox)', () => {
    const component = renderHeader();

    expect(
      component.getByRole('button', { name: /toggle sidebar/i }),
    ).toBeInTheDocument();
    expect(component.getByRole('searchbox')).toBeInTheDocument();
  });
});
