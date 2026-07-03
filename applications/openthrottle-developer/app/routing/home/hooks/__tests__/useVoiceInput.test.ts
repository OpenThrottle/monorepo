import { describe, expect, it } from 'vitest';

import { joinDraftParts } from '../useVoiceInput';

describe('joinDraftParts', () => {
  it('uses the bare transcript when there is no frozen prefix', () => {
    expect(joinDraftParts('', ' Hello world.')).toBe('Hello world.');
  });

  it('keeps the prefix when the transcript is empty', () => {
    expect(joinDraftParts('typed so far', '   ')).toBe('typed so far');
  });

  it('joins prefix and transcript with exactly one space', () => {
    expect(joinDraftParts('typed so far', ' and spoken.')).toBe(
      'typed so far and spoken.',
    );
    expect(joinDraftParts('trailing space ', ' spoken')).toBe(
      'trailing space spoken',
    );
  });
});
