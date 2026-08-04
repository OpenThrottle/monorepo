import { describe, expect, it } from 'vitest';

import { REACT_ROUTER_ROLLOUT_PACKAGE } from '../index';

describe('REACT_ROUTER_ROLLOUT_PACKAGE', () => {
  it('exports the package name placeholder', () => {
    expect(REACT_ROUTER_ROLLOUT_PACKAGE).toBe(
      '@openthrottle/react-router-rollout',
    );
  });
});
