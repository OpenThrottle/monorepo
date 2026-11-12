import { describe, expect, test } from 'vitest';

import { getAgentCliActionLabel } from '../getAgentCliActionLabel';

describe('getAgentCliActionLabel', () => {
  test('uses the verb while idle', () => {
    expect(getAgentCliActionLabel({ installed: true, running: false })).toBe(
      'Update',
    );
    expect(getAgentCliActionLabel({ installed: false, running: false })).toBe(
      'Install',
    );
  });

  test('uses the progressive form while a run is in flight', () => {
    expect(getAgentCliActionLabel({ installed: true, running: true })).toBe(
      'Updating…',
    );
    expect(getAgentCliActionLabel({ installed: false, running: true })).toBe(
      'Installing…',
    );
  });
});
