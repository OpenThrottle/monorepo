import { describe, expect, it } from 'vitest';

import { composeCursorStartupErrorText } from './conversation-stream.copy';

// Captured verbatim off cursor-agent 2026.08.11 during the task 1 evidence gate.
const REAL_AUTH_REQUIRED =
  "Error: Authentication required. Please run 'agent login' first, or set CURSOR_API_KEY environment variable.";
const REAL_INVALID_KEY =
  '\u001b[33m! Warning: The provided API key is invalid.\u001b[0m\nThe API key was loaded from the CURSOR_API_KEY environment variable.';

describe('composeCursorStartupErrorText', () => {
  it('tells an unauthenticated user to log in, naming the command', () => {
    const text = composeCursorStartupErrorText(REAL_AUTH_REQUIRED);

    expect(text).toContain('cursor-agent login');
    expect(text).toContain('send this message again');
  });

  it('treats an invalid API key as an auth problem, not a transient blip', () => {
    expect(composeCursorStartupErrorText(REAL_INVALID_KEY)).toContain(
      'cursor-agent login',
    );
  });

  it('names the install command when the binary is missing', () => {
    const text = composeCursorStartupErrorText('spawn cursor-agent ENOENT');

    expect(text).toContain('not installed');
    expect(text).toContain('OPENTHROTTLE_CURSOR_AGENT_BIN');
  });

  it('says a timeout is usually a cold start and is worth retrying', () => {
    const text = composeCursorStartupErrorText(
      'cursor-agent create-chat timed out after 30000ms bin=/x cwd=/y',
    );

    expect(text).toContain('cold start');
  });

  it('falls back to copy that points at the server logs', () => {
    const text = composeCursorStartupErrorText('exited with code 3');

    expect(text).toContain('server logs');
  });

  it('strips ANSI escapes, which previously reached the composer verbatim', () => {
    const text = composeCursorStartupErrorText(REAL_INVALID_KEY);

    expect(text).not.toContain('\u001b');
    expect(text).not.toContain('[33m');
  });

  it('keeps the raw message as a detail line so a misclassification still diagnoses', () => {
    const text = composeCursorStartupErrorText('exited with code 3');

    expect(text).toContain('Details: exited with code 3');
  });

  it('truncates a very long raw message rather than flooding the thread', () => {
    const text = composeCursorStartupErrorText('x'.repeat(500));

    expect(text.length).toBeLessThan(500);
    expect(text).toContain('…');
  });

  it('omits the detail line entirely when there is no raw message', () => {
    const text = composeCursorStartupErrorText('   ');

    expect(text).not.toContain('Details:');
    expect(text).toContain('server logs');
  });
});
