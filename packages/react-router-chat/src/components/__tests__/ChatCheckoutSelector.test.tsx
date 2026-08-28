import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ChatCheckoutSelector } from '../ChatCheckoutSelector';
import type { ChatCheckoutSelectorProps } from '../ChatCheckoutSelector';
import type { ChatCheckoutOption } from '../../types';

const CHECKOUTS: readonly ChatCheckoutOption[] = [
  { branch: 'main', id: 'repo-a', label: 'openthrottle' },
  { branch: 'develop', id: 'repo-b', label: 'playground' },
];

const renderSelector = (
  overrides: Partial<ChatCheckoutSelectorProps> = {},
): RenderResult =>
  render(
    <ChatCheckoutSelector
      checkouts={CHECKOUTS}
      onCheckoutChange={vi.fn()}
      selectedCheckoutId="repo-a"
      {...overrides}
    />,
  );

describe('ChatCheckoutSelector Component', () => {
  test('shows the selected checkout label and branch on the trigger', () => {
    const component = renderSelector();

    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).toHaveTextContent('openthrottle');
    expect(
      component.getByTestId('ChatCheckoutSelector-branch'),
    ).toHaveTextContent('main');
  });

  test('lists the available checkouts when opened', async () => {
    const user = userEvent.setup();
    const component = renderSelector();
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));

    expect(
      component.getByTestId('ChatCheckoutSelector-option-repo-a'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    ).toHaveTextContent('playground');
  });

  test('fires onCheckoutChange with the chosen checkout id', async () => {
    const onCheckoutChange = vi.fn();
    const user = userEvent.setup();
    const component = renderSelector({ onCheckoutChange });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.click(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    );

    expect(onCheckoutChange).toHaveBeenCalledWith('repo-b');
  });

  test('renders a disabled trigger when no checkouts are supplied', () => {
    const component = renderSelector({ checkouts: [] });

    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent('No checkouts');
  });
});

const CHECKOUTS_THREE: readonly ChatCheckoutOption[] = [
  ...CHECKOUTS,
  { branch: 'main', id: 'repo-c', label: 'showroom' },
];

const renderMulti = (
  overrides: Partial<ChatCheckoutSelectorProps> = {},
): RenderResult =>
  render(
    <ChatCheckoutSelector
      checkouts={CHECKOUTS_THREE}
      maxCheckouts={2}
      multiple={true}
      onCheckoutChange={vi.fn()}
      onCheckoutsChange={vi.fn()}
      selectedCheckoutIds={['repo-a']}
      {...overrides}
    />,
  );

describe('ChatCheckoutSelector Component — multiple mode', () => {
  test('shows the primary label plus a +N affordance for secondaries', () => {
    const component = renderMulti({
      selectedCheckoutIds: ['repo-a', 'repo-b'],
    });

    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).toHaveTextContent('openthrottle');
    expect(
      component.getByTestId('ChatCheckoutSelector-overflow'),
    ).toHaveTextContent('+1');
  });

  test('omits the +N affordance when only the primary is selected', () => {
    const component = renderMulti();

    expect(
      component.queryByTestId('ChatCheckoutSelector-overflow'),
    ).not.toBeInTheDocument();
  });

  test('marks index 0 primary and every other selection context only', async () => {
    const user = userEvent.setup();
    const component = renderMulti({
      selectedCheckoutIds: ['repo-a', 'repo-b'],
    });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));

    expect(
      component.getByTestId('ChatCheckoutSelector-primary-repo-a'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('ChatCheckoutSelector-context-repo-b'),
    ).toHaveTextContent('Context only');
    expect(
      component.queryByTestId('ChatCheckoutSelector-primary-repo-b'),
    ).not.toBeInTheDocument();
  });

  test('appends a toggled checkout after the primary and keeps the menu open', async () => {
    const onCheckoutsChange = vi.fn();
    const user = userEvent.setup();
    const component = renderMulti({ onCheckoutsChange });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.click(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    );

    expect(onCheckoutsChange).toHaveBeenCalledWith(['repo-a', 'repo-b']);
    // The menu must survive the toggle so a second pick is possible.
    expect(
      component.getByTestId('ChatCheckoutSelector-option-repo-c'),
    ).toBeInTheDocument();
  });

  test('deselects an already-selected checkout', async () => {
    const onCheckoutsChange = vi.fn();
    const user = userEvent.setup();
    const component = renderMulti({
      onCheckoutsChange,
      selectedCheckoutIds: ['repo-a', 'repo-b'],
    });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.click(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    );

    expect(onCheckoutsChange).toHaveBeenCalledWith(['repo-a']);
  });

  test('disables unselected rows at the cap but leaves selected ones toggleable', async () => {
    const user = userEvent.setup();
    const component = renderMulti({
      selectedCheckoutIds: ['repo-a', 'repo-b'],
    });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));

    // cmdk always emits `data-disabled`, so assert on the VALUE, not presence.
    expect(
      component.getByTestId('ChatCheckoutSelector-option-repo-c'),
    ).toHaveAttribute('data-disabled', 'true');
    expect(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    ).toHaveAttribute('data-disabled', 'false');
  });

  test('stays single-select when onCheckoutsChange is absent', async () => {
    const onCheckoutChange = vi.fn();
    const user = userEvent.setup();
    const component = render(
      <ChatCheckoutSelector
        checkouts={CHECKOUTS_THREE}
        maxCheckouts={2}
        multiple={true}
        onCheckoutChange={onCheckoutChange}
        selectedCheckoutId="repo-a"
      />,
    );
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.click(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    );

    expect(onCheckoutChange).toHaveBeenCalledWith('repo-b');
  });
});

/**
 * The reported scenario: two `monorepo` checkouts in different GitHub orgs, one
 * checkout with no remote at all. Flat display names give the user nothing to
 * pick on, which is what the grouped, qualified, searchable list fixes.
 */
const LOOKALIKES: readonly ChatCheckoutOption[] = [
  {
    branch: 'main',
    filesystemPath: '/Users/matt/Development/openthrottle',
    id: 'ot',
    label: 'monorepo',
    projectName: 'OpenThrottle',
    remoteUrl: 'git@github.com:openthrottle/monorepo.git',
  },
  {
    branch: 'trunk',
    filesystemPath: '/Users/matt/Work/monorepo',
    id: 'ss',
    label: 'monorepo',
    remoteUrl: 'git@github.com:shiftsmart/monorepo.git',
  },
  {
    filesystemPath: '/Users/matt/scratch/sandbox',
    id: 'sb',
    label: 'sandbox',
  },
];

const renderLookalikes = (
  overrides: Partial<ChatCheckoutSelectorProps> = {},
): RenderResult =>
  render(
    <ChatCheckoutSelector
      checkouts={LOOKALIKES}
      onCheckoutChange={vi.fn()}
      selectedCheckoutId="ot"
      {...overrides}
    />,
  );

describe('ChatCheckoutSelector Component — disambiguation', () => {
  test('promotes the trigger to owner/name when two checkouts share a name', () => {
    const component = renderLookalikes();

    expect(
      component.getByTestId('ChatCheckoutSelector-trigger'),
    ).toHaveTextContent('openthrottle/monorepo');
  });

  test('leaves the trigger bare for a name that is already unique', () => {
    const component = renderLookalikes({ selectedCheckoutId: 'sb' });

    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).toHaveTextContent('sandbox');
    expect(trigger).not.toHaveTextContent('scratch');
  });

  test('gives the two same-named rows distinct qualifiers', async () => {
    const user = userEvent.setup();
    const component = renderLookalikes();
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));

    expect(
      component.getByTestId('ChatCheckoutSelector-qualifier-ot'),
    ).toHaveTextContent('openthrottle/monorepo');
    expect(
      component.getByTestId('ChatCheckoutSelector-qualifier-ss'),
    ).toHaveTextContent('shiftsmart/monorepo');
  });

  test('falls back to a shortened path for a checkout with no remote', async () => {
    const user = userEvent.setup();
    const component = renderLookalikes();
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));

    expect(
      component.getByTestId('ChatCheckoutSelector-qualifier-sb'),
    ).toHaveTextContent('…/scratch/sandbox');
  });

  test('groups rows under their owner, with the remote-less ones last', async () => {
    const user = userEvent.setup();
    const component = renderLookalikes();
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));

    // Owner headings are visible, and the catch-all bucket is pinned last.
    const openthrottle = component.getByText('openthrottle');
    const shiftsmart = component.getByText('shiftsmart');
    const localOnly = component.getByText('Local only');
    expect(
      openthrottle.compareDocumentPosition(shiftsmart) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      shiftsmart.compareDocumentPosition(localOnly) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test('narrows the list by owner, which the display name alone cannot do', async () => {
    const user = userEvent.setup();
    const component = renderLookalikes();
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.type(
      component.getByTestId('ChatCheckoutSelector-search'),
      'shiftsmart',
    );

    expect(
      component.getByTestId('ChatCheckoutSelector-option-ss'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatCheckoutSelector-option-ot'),
    ).not.toBeInTheDocument();
  });

  test('narrows the list by project name and by filesystem path', async () => {
    const user = userEvent.setup();
    const component = renderLookalikes();
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    const search = component.getByTestId('ChatCheckoutSelector-search');

    await user.type(search, 'OpenThrottle');
    expect(
      component.getByTestId('ChatCheckoutSelector-option-ot'),
    ).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'scratch');
    expect(
      component.getByTestId('ChatCheckoutSelector-option-sb'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatCheckoutSelector-option-ot'),
    ).not.toBeInTheDocument();
  });

  test('shows the empty state when nothing matches the search', async () => {
    const user = userEvent.setup();
    const component = renderLookalikes();
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.type(
      component.getByTestId('ChatCheckoutSelector-search'),
      'nothing-matches-this',
    );

    expect(component.getByText('No matching checkouts.')).toBeInTheDocument();
  });

  test('selects a filtered row by keyboard alone', async () => {
    const onCheckoutChange = vi.fn();
    const user = userEvent.setup();
    const component = renderLookalikes({ onCheckoutChange });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.type(
      component.getByTestId('ChatCheckoutSelector-search'),
      'shiftsmart',
    );
    await user.keyboard('{Enter}');

    expect(onCheckoutChange).toHaveBeenCalledWith('ss');
  });

  test('closes the picker after a single-select pick', async () => {
    const user = userEvent.setup();
    const component = renderLookalikes();
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.click(component.getByTestId('ChatCheckoutSelector-option-ss'));

    expect(
      component.queryByTestId('ChatCheckoutSelector-search'),
    ).not.toBeInTheDocument();
  });

  test('renders bare labels when the consumer supplies no identity at all', async () => {
    // The admin app's narrower discovery query — must look exactly like before.
    const user = userEvent.setup();
    const component = renderLookalikes({ checkouts: CHECKOUTS });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));

    expect(
      component.getByTestId('ChatCheckoutSelector-option-repo-a'),
    ).toHaveTextContent('openthrottle');
    expect(
      component.queryByTestId('ChatCheckoutSelector-qualifier-repo-a'),
    ).not.toBeInTheDocument();
  });
});

/**
 * The reported bug's list: personal and org checkouts side by side, every one
 * of them under `/Users/matt/…` — the shared path prefix cmdk's fuzzy
 * subsequence scoring used to match `visormatt` against on every row.
 */
const SHARED_PATH_PREFIX: readonly ChatCheckoutOption[] = [
  {
    branch: 'main',
    filesystemPath: '/Users/matt/Development/openthrottle',
    id: 'mine',
    label: 'monorepo',
    projectName: 'OpenThrottle',
    remoteUrl: 'git@github.com:visormatt/monorepo.git',
  },
  {
    branch: 'main',
    filesystemPath: '/Users/matt/Development/shiftsmart-monorepo',
    id: 'work-mono',
    label: 'monorepo',
    remoteUrl: 'git@github.com:shiftsmartinc/monorepo.git',
  },
  {
    branch: 'develop',
    filesystemPath: '/Users/matt/Development/nativeapps',
    id: 'work-native',
    label: 'nativeapps',
    remoteUrl: 'git@github.com:shiftsmartinc/nativeapps.git',
  },
];

const renderSharedPathPrefix = (): RenderResult =>
  render(
    <ChatCheckoutSelector
      checkouts={SHARED_PATH_PREFIX}
      onCheckoutChange={vi.fn()}
      selectedCheckoutId="mine"
    />,
  );

/** Open the picker and type `search` into it. */
const search = async (
  component: RenderResult,
  query: string,
): Promise<void> => {
  const user = userEvent.setup();
  await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
  await user.type(component.getByTestId('ChatCheckoutSelector-search'), query);
};

describe('ChatCheckoutSelector Component — strict search matching', () => {
  test('keeps only the owner that contains the query, heading included', async () => {
    const component = renderSharedPathPrefix();
    await search(component, 'visormatt');

    expect(
      component.getByTestId('ChatCheckoutSelector-option-mine'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatCheckoutSelector-option-work-mono'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByTestId('ChatCheckoutSelector-option-work-native'),
    ).not.toBeInTheDocument();
    // cmdk keeps an emptied group mounted but hidden, heading and all.
    expect(component.getByText('shiftsmartinc')).not.toBeVisible();
  });

  test('still spans every org for a shared display name', async () => {
    const component = renderSharedPathPrefix();
    await search(component, 'monorepo');

    expect(
      component.getByTestId('ChatCheckoutSelector-option-mine'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('ChatCheckoutSelector-option-work-mono'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatCheckoutSelector-option-work-native'),
    ).not.toBeInTheDocument();
  });

  test('narrows to one checkout when every token has to match', async () => {
    const component = renderSharedPathPrefix();
    await search(component, 'shiftsmartinc mono');

    expect(
      component.getByTestId('ChatCheckoutSelector-option-work-mono'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatCheckoutSelector-option-mine'),
    ).not.toBeInTheDocument();
  });

  test('shows the empty state for a garbage query', async () => {
    const component = renderSharedPathPrefix();
    await search(component, 'nothing-matches-this');

    expect(component.getByText('No matching checkouts.')).toBeInTheDocument();
  });
});
