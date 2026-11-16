import { describe, expect, test } from 'vitest';

import type { CommanderGroup } from '../../components/OpenThrottleCommander';
import { COMMANDER_ESCAPE_HEADING } from '../../data/data.copy';
import { getCommanderEscapeHeading } from '../getCommanderEscapeHeading';

describe('getCommanderEscapeHeading', () => {
  const groups: readonly CommanderGroup[] = [
    {
      heading: 'Navigation',
      items: [
        { id: 'nav-plans', label: 'Plans', value: 'plans' },
        { id: 'nav-queues', label: 'Queues' },
      ],
    },
  ];

  describe('without extras', () => {
    test('heads the group Search', () => {
      expect(
        getCommanderEscapeHeading({ groups, hasExtras: false, search: 'zzz' }),
      ).toBe(COMMANDER_ESCAPE_HEADING.search);
    });
  });

  describe('with extras', () => {
    test('claims no match when no static row matches', () => {
      expect(
        getCommanderEscapeHeading({
          groups,
          hasExtras: true,
          search: 'argo cd',
        }),
      ).toBe(COMMANDER_ESCAPE_HEADING.noMatch);
    });

    test('takes a neutral heading when a static row matches its value', () => {
      expect(
        getCommanderEscapeHeading({ groups, hasExtras: true, search: 'plans' }),
      ).toBe(COMMANDER_ESCAPE_HEADING.more);
    });

    test('falls back to the item id when it has no value', () => {
      expect(
        getCommanderEscapeHeading({
          groups,
          hasExtras: true,
          search: 'queues',
        }),
      ).toBe(COMMANDER_ESCAPE_HEADING.more);
    });

    test('claims no match when there are no groups', () => {
      expect(
        getCommanderEscapeHeading({ groups: [], hasExtras: true, search: 'x' }),
      ).toBe(COMMANDER_ESCAPE_HEADING.noMatch);
    });
  });
});
