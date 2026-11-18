import { describe, expect, it } from 'vitest';

import {
  WORKSPACE_EDITOR_IDS,
  WORKSPACE_EDITORS,
} from './user-workspace-settings.constants.ts';

describe('WORKSPACE_EDITOR_IDS', () => {
  it('lists every editor in WORKSPACE_EDITORS', () => {
    expect([...WORKSPACE_EDITOR_IDS].sort()).toEqual(
      Object.keys(WORKSPACE_EDITORS).sort(),
    );
  });

  it('maps each editor key to the same id', () => {
    for (const [key, id] of Object.entries(WORKSPACE_EDITORS)) {
      expect(id).toBe(key);
    }
  });
});
