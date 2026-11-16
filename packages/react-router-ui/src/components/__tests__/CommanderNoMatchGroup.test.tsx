import { Command, CommandList } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { CommanderNoMatchGroupProps } from '../CommanderNoMatchGroup';
import { CommanderNoMatchGroup } from '../CommanderNoMatchGroup';

describe('CommanderNoMatchGroup Component', () => {
  let props: CommanderNoMatchGroupProps;

  const renderGroup = (p: CommanderNoMatchGroupProps): RenderResult => {
    return render(
      <Command>
        <CommandList>
          <CommanderNoMatchGroup {...p} />
        </CommandList>
      </Command>,
    );
  };

  beforeEach(() => {
    props = {
      fallbackItems: [{ id: 'browse', isFallback: true, label: 'Browse' }],
      heading: 'No match',
      leadingItems: [{ id: 'match', label: 'Open plan' }],
      onSearch: vi.fn(),
      onSelect: vi.fn(),
      search: 'argo',
      searchValue: '__empty_state_search__ argo',
    };
  });

  test('renders leading extras, then Search, then fallback extras', () => {
    const component = renderGroup(props);
    const options = component.getAllByRole('option');

    expect(
      options.map((option) => {
        return option.dataset['testid'];
      }),
    ).toEqual([
      'CommanderItemRow',
      'OpenThrottleCommander-search',
      'CommanderItemRow',
    ]);
    expect(options[0]).toHaveTextContent('Open plan');
    expect(options[2]).toHaveTextContent('Browse');
  });

  describe('when onSearch is undefined', () => {
    test('omits the Search row', () => {
      const component = renderGroup({ ...props, onSearch: undefined });

      expect(
        component.queryByTestId('OpenThrottleCommander-search'),
      ).not.toBeInTheDocument();
      expect(component.getAllByRole('option')).toHaveLength(2);
    });
  });

  test('runs onSearch when the Search row is chosen', async () => {
    const user = userEvent.setup();
    const component = renderGroup(props);

    await user.click(component.getByTestId('OpenThrottleCommander-search'));

    expect(props.onSearch).toHaveBeenCalledTimes(1);
  });
});
