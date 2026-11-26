import { describe, expect, test } from 'vitest';

import {
  defaultSessionDrawerState,
  parseSessionDrawerCookie,
  serializeSessionDrawerCookie,
} from '../session-drawer-cookie';

describe('parseSessionDrawerCookie', () => {
  test('reads back what serializeSessionDrawerCookie wrote', () => {
    const state = { collapsedSections: ['files', 'context'], isOpen: true };
    const pair = serializeSessionDrawerCookie(state).split(';')[0] ?? '';

    expect(parseSessionDrawerCookie(`theme=dark; ${pair}; other=1`)).toEqual(
      state,
    );
  });

  describe('falls back to the default', () => {
    test('which is closed with nothing collapsed', () => {
      expect(defaultSessionDrawerState()).toEqual({
        collapsedSections: [],
        isOpen: false,
      });
    });

    test('when the cookie is missing', () => {
      expect(parseSessionDrawerCookie('theme=dark')).toEqual(
        defaultSessionDrawerState(),
      );
    });

    test('when the value is not JSON', () => {
      expect(
        parseSessionDrawerCookie('ot_chat_session_drawer=%7Bnope'),
      ).toEqual(defaultSessionDrawerState());
    });

    test('field by field when a field has the wrong type', () => {
      const value = encodeURIComponent(
        JSON.stringify({ collapsedSections: 'files', isOpen: 'yes' }),
      );

      expect(
        parseSessionDrawerCookie(`ot_chat_session_drawer=${value}`),
      ).toEqual(defaultSessionDrawerState());
    });
  });
});

describe('serializeSessionDrawerCookie', () => {
  test('persists site-wide for a year', () => {
    const assignment = serializeSessionDrawerCookie(
      defaultSessionDrawerState(),
    );

    expect(assignment).toContain('path=/');
    expect(assignment).toContain('max-age=31536000');
  });
});
