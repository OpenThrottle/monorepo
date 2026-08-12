import { describe, expect, test } from 'vitest';
import { IDE_SEMANTIC_STATUS } from '@openthrottle/react-router-ide';
import { toSemanticStatus } from '~/routing/ide/utils/semantic-status';

describe('toSemanticStatus', () => {
  test('maps each known server status string to its client union member', () => {
    expect(toSemanticStatus('indexing')).toBe(IDE_SEMANTIC_STATUS.indexing);
    expect(toSemanticStatus('notIndexed')).toBe(IDE_SEMANTIC_STATUS.notIndexed);
    expect(toSemanticStatus('ready')).toBe(IDE_SEMANTIC_STATUS.ready);
  });

  test('falls back to unavailable for an unknown status', () => {
    expect(toSemanticStatus('')).toBe(IDE_SEMANTIC_STATUS.unavailable);
    expect(toSemanticStatus('bogus')).toBe(IDE_SEMANTIC_STATUS.unavailable);
  });
});
