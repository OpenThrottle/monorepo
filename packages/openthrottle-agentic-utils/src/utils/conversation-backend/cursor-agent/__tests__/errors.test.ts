import { describe, expect, it } from 'vitest';

import {
  CURSOR_FAILURE_KINDS,
  classifyCursorFailure,
  isRetryableCursorFailure,
} from '../errors.ts';

// Captured verbatim off cursor-agent 2026.08.11 during the task 1 evidence gate.
const REAL_AUTH_REQUIRED =
  "Error: Authentication required. Please run 'agent login' first, or set CURSOR_API_KEY environment variable.";
const REAL_INVALID_KEY =
  '[33m! Warning: The provided API key is invalid.[0m\nThe API key was loaded from the CURSOR_API_KEY environment variable.\nPlease check you have the right key, create a new one, or authenticate without it.';

describe('classifyCursorFailure', () => {
  it('classifies the real "authentication required" stderr', () => {
    expect(classifyCursorFailure(REAL_AUTH_REQUIRED)).toBe(
      CURSOR_FAILURE_KINDS.authRequired,
    );
  });

  it('classifies the real "invalid API key" stderr, ANSI and all', () => {
    expect(classifyCursorFailure(REAL_INVALID_KEY)).toBe(
      CURSOR_FAILURE_KINDS.authRequired,
    );
  });

  it('classifies the macOS keychain failures cursor maps from osStatus', () => {
    expect(
      classifyCursorFailure(
        'Your macOS login keychain is locked or is denying access',
      ),
    ).toBe(CURSOR_FAILURE_KINDS.authRequired);
    expect(classifyCursorFailure('errSecInteractionNotAllowed')).toBe(
      CURSOR_FAILURE_KINDS.authRequired,
    );
  });

  it('classifies a missing binary from the spawn ENOENT', () => {
    expect(classifyCursorFailure('spawn cursor-agent ENOENT')).toBe(
      CURSOR_FAILURE_KINDS.notInstalled,
    );
  });

  it('classifies our own mint timeout wording', () => {
    expect(
      classifyCursorFailure(
        'cursor-agent create-chat timed out after 30000ms bin=/x cwd=/y',
      ),
    ).toBe(CURSOR_FAILURE_KINDS.timeout);
  });

  it('falls back to unknown for anything unrecognized', () => {
    expect(classifyCursorFailure('cursor-agent exited with code 3')).toBe(
      CURSOR_FAILURE_KINDS.unknown,
    );
  });

  it('prefers notInstalled over auth when a path-ish ENOENT also mentions login', () => {
    expect(classifyCursorFailure('spawn ENOENT — please run login first')).toBe(
      CURSOR_FAILURE_KINDS.notInstalled,
    );
  });

  it('prefers auth over timeout: an expired login is still the user to fix', () => {
    expect(
      classifyCursorFailure('Authentication required. Request timed out.'),
    ).toBe(CURSOR_FAILURE_KINDS.authRequired);
  });
});

describe('isRetryableCursorFailure', () => {
  it('retries timeouts and unrecognized failures', () => {
    expect(isRetryableCursorFailure(CURSOR_FAILURE_KINDS.timeout)).toBe(true);
    // Deliberate: the cold-start failures this plan chased match no pattern.
    expect(isRetryableCursorFailure(CURSOR_FAILURE_KINDS.unknown)).toBe(true);
  });

  it('never retries a failure the user has to fix', () => {
    expect(isRetryableCursorFailure(CURSOR_FAILURE_KINDS.authRequired)).toBe(
      false,
    );
    expect(isRetryableCursorFailure(CURSOR_FAILURE_KINDS.notInstalled)).toBe(
      false,
    );
  });
});
