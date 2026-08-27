/**
 * Argv tests for the antigravity adapter. Flag facts and ordering come from
 * docs/openthrottle/antigravity-stream-json-schema.md §1, verified against 1.1.21.
 */

import { describe, expect, it } from 'vitest';

import { CONVERSATION_PERMISSION_MODES } from '../../types.ts';
import { buildAntigravityArgv } from '../argv.ts';

describe('buildAntigravityArgv', () => {
  it('puts the prompt immediately after -p and requests the NDJSON stream', () => {
    expect(buildAntigravityArgv({ prompt: 'do the thing' })).toEqual([
      '-p',
      'do the thing',
      '--output-format',
      'stream-json',
    ]);
  });

  it('keeps a prompt that starts with a dash safe as a flag value', () => {
    const argv = buildAntigravityArgv({ prompt: '--not-a-flag' });

    expect(argv[0]).toBe('-p');
    expect(argv[1]).toBe('--not-a-flag');
  });

  it('emits --add-dir for the cwd (without it agy writes to a scratch project)', () => {
    expect(buildAntigravityArgv({ cwd: '/work/repo', prompt: 'p' })).toContain(
      '--add-dir',
    );
    expect(buildAntigravityArgv({ cwd: '/work/repo', prompt: 'p' })).toContain(
      '/work/repo',
    );
  });

  it('omits --add-dir when cwd is absent or blank', () => {
    expect(buildAntigravityArgv({ prompt: 'p' })).not.toContain('--add-dir');
    expect(buildAntigravityArgv({ cwd: '   ', prompt: 'p' })).not.toContain(
      '--add-dir',
    );
  });

  it('maps fullAccess to --dangerously-skip-permissions', () => {
    expect(
      buildAntigravityArgv({
        permissionMode: CONVERSATION_PERMISSION_MODES.fullAccess,
        prompt: 'p',
      }),
    ).toContain('--dangerously-skip-permissions');
  });

  it('maps autoAcceptEdits to --mode accept-edits', () => {
    const argv = buildAntigravityArgv({
      permissionMode: CONVERSATION_PERMISSION_MODES.autoAcceptEdits,
      prompt: 'p',
    });

    expect(argv).toContain('--mode');
    expect(argv).toContain('accept-edits');
    expect(argv).not.toContain('--dangerously-skip-permissions');
  });

  it('emits no permission flag for supervised or the default posture', () => {
    const supervised = buildAntigravityArgv({
      permissionMode: CONVERSATION_PERMISSION_MODES.supervised,
      prompt: 'p',
    });

    expect(supervised).not.toContain('--dangerously-skip-permissions');
    expect(supervised).not.toContain('--mode');
    expect(buildAntigravityArgv({ prompt: 'p' })).not.toContain('--mode');
  });

  it('resumes by conversation id (agy is id-based, unlike gemini)', () => {
    const argv = buildAntigravityArgv({
      prompt: 'p',
      resumeConversationId: 'abc-123',
    });

    expect(argv).toContain('--conversation');
    expect(argv).toContain('abc-123');
  });

  it('omits --conversation when the id is absent or blank', () => {
    expect(buildAntigravityArgv({ prompt: 'p' })).not.toContain(
      '--conversation',
    );
    expect(
      buildAntigravityArgv({ prompt: 'p', resumeConversationId: '  ' }),
    ).not.toContain('--conversation');
  });

  it('appends --model, but omits it when unset, blank, or auto', () => {
    expect(
      buildAntigravityArgv({ model: 'gemini-3.1-pro-high', prompt: 'p' }),
    ).toContain('gemini-3.1-pro-high');
    expect(buildAntigravityArgv({ model: 'auto', prompt: 'p' })).not.toContain(
      '--model',
    );
    expect(buildAntigravityArgv({ model: '  ', prompt: 'p' })).not.toContain(
      '--model',
    );
  });
  it('emits the cwd --add-dir first, then one repeated --add-dir per extra directory', () => {
    const argv = buildAntigravityArgv({
      additionalDirectories: ['/abs/second', '/abs/third'],
      cwd: '/abs/primary',
      prompt: 'p',
    });

    const dirs = argv.reduce<string[]>(
      (paths, entry, index) =>
        entry === '--add-dir' ? [...paths, argv[index + 1]] : paths,
      [],
    );

    // Order is load-bearing: the workspace dir comes first.
    expect(dirs).toEqual(['/abs/primary', '/abs/second', '/abs/third']);
  });

  it('drops blank additional directories rather than emitting an empty flag value', () => {
    const argv = buildAntigravityArgv({
      additionalDirectories: ['  ', '/abs/real'],
      cwd: '/abs/primary',
      prompt: 'p',
    });

    expect(argv.filter((entry) => entry === '--add-dir')).toHaveLength(2);
    expect(argv).toContain('/abs/real');
  });

  it('emits no extra --add-dir when the list is absent or empty', () => {
    expect(
      buildAntigravityArgv({ cwd: '/abs/primary', prompt: 'p' }).filter(
        (entry) => entry === '--add-dir',
      ),
    ).toHaveLength(1);
    expect(
      buildAntigravityArgv({
        additionalDirectories: [],
        cwd: '/abs/primary',
        prompt: 'p',
      }).filter((entry) => entry === '--add-dir'),
    ).toHaveLength(1);
  });
});
