import { describe, expect, it } from 'vitest';
import {
  getRalphOutputMarkerFlags,
  parseRalphAgentParseControl,
  parseRalphCompleteTaskSignals,
  ralphOutputHasPromiseComplete,
} from './ralph-agent-output.js';

const VALID_ID = '2e53b3d4-13db-4137-8c01-3331f9fd8fea';
const ANOTHER_VALID_ID = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

const completeMarker = (id: string): string =>
  `<ralph:task-complete>${id}</ralph:task-complete>`;

describe('parseRalphCompleteTaskSignals', () => {
  it('matches a valid task-complete marker', () => {
    expect(parseRalphCompleteTaskSignals(completeMarker(VALID_ID))).toEqual([
      VALID_ID,
    ]);
  });

  it('matches multiple distinct ids in order', () => {
    const output = `${completeMarker(VALID_ID)} text ${completeMarker(
      ANOTHER_VALID_ID,
    )}`;

    expect(parseRalphCompleteTaskSignals(output)).toEqual([
      VALID_ID,
      ANOTHER_VALID_ID,
    ]);
  });

  it('lowercases ids and dedupes case-insensitive repeats', () => {
    const output = `${completeMarker(
      VALID_ID.toUpperCase(),
    )} ${completeMarker(VALID_ID)}`;

    expect(parseRalphCompleteTaskSignals(output)).toEqual([VALID_ID]);
  });

  it('rejects a malformed id (wrong segment lengths)', () => {
    const output = '<ralph:task-complete>not-a-real-uuid</ralph:task-complete>';

    expect(parseRalphCompleteTaskSignals(output)).toEqual([]);
  });

  it('rejects a uuid with an out-of-range version nibble', () => {
    // Version nibble `9` is outside the allowed `[1-5]` range.
    const output = completeMarker('2e53b3d4-13db-9137-8c01-3331f9fd8fea');

    expect(parseRalphCompleteTaskSignals(output)).toEqual([]);
  });

  it('rejects a uuid with an out-of-range variant nibble', () => {
    // Variant nibble `c` is outside the allowed `[89ab]` range.
    const output = completeMarker('2e53b3d4-13db-4137-cc01-3331f9fd8fea');

    expect(parseRalphCompleteTaskSignals(output)).toEqual([]);
  });

  it('returns an empty list when no markers are present', () => {
    expect(parseRalphCompleteTaskSignals('plain output, no markers')).toEqual(
      [],
    );
  });

  it('is repeatable across calls (global regex lastIndex is reset)', () => {
    const output = completeMarker(VALID_ID);

    expect(parseRalphCompleteTaskSignals(output)).toEqual([VALID_ID]);
    expect(parseRalphCompleteTaskSignals(output)).toEqual([VALID_ID]);
  });
});

describe('getRalphOutputMarkerFlags', () => {
  it('flags each promise marker independently', () => {
    expect(getRalphOutputMarkerFlags('<promise>COMPLETE</promise>')).toEqual({
      hasComplete: true,
      hasError: false,
      hasInputRequired: false,
    });

    expect(getRalphOutputMarkerFlags('<promise>ERROR</promise>')).toEqual({
      hasComplete: false,
      hasError: true,
      hasInputRequired: false,
    });

    expect(
      getRalphOutputMarkerFlags('<promise>INPUT_REQUIRED</promise>'),
    ).toEqual({ hasComplete: false, hasError: false, hasInputRequired: true });
  });

  it('reports all false when no markers are present', () => {
    expect(getRalphOutputMarkerFlags('nothing here')).toEqual({
      hasComplete: false,
      hasError: false,
      hasInputRequired: false,
    });
  });
});

describe('ralphOutputHasPromiseComplete', () => {
  it('is true only when the complete marker is present', () => {
    expect(ralphOutputHasPromiseComplete('<promise>COMPLETE</promise>')).toBe(
      true,
    );
    expect(ralphOutputHasPromiseComplete('<promise>ERROR</promise>')).toBe(
      false,
    );
  });
});

describe('parseRalphAgentParseControl precedence (ERROR > INPUT_REQUIRED > COMPLETE)', () => {
  it('returns ERROR when error co-occurs with input-required and complete', () => {
    const output =
      '<promise>ERROR</promise><promise>INPUT_REQUIRED</promise><promise>COMPLETE</promise>';

    expect(parseRalphAgentParseControl(output)).toBe('ERROR');
  });

  it('returns INPUT_REQUIRED when input-required co-occurs with complete (no error)', () => {
    const output =
      '<promise>INPUT_REQUIRED</promise><promise>COMPLETE</promise>';

    expect(parseRalphAgentParseControl(output)).toBe('INPUT_REQUIRED');
  });

  it('returns COMPLETE when only the complete marker is present', () => {
    expect(parseRalphAgentParseControl('<promise>COMPLETE</promise>')).toBe(
      'COMPLETE',
    );
  });

  it('returns NONE when no terminal markers are present', () => {
    expect(parseRalphAgentParseControl('still working...')).toBe('NONE');
  });
});
