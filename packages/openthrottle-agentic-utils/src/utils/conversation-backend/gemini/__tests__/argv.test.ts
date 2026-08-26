/**
 * Argv-construction tests for the gemini adapter. The prompt never appears in
 * argv (it travels via stdin — see gemini.ts), so these assert the flag set
 * only: stream-json output, the 1:1 --approval-mode mapping, and --model
 * omission for empty/auto.
 */

import { describe, expect, it } from 'vitest';

import { CONVERSATION_PERMISSION_MODES } from '../../types.ts';
import {
  GEMINI_BIN_ENV,
  GEMINI_DEFAULT_BIN,
  buildGeminiArgv,
} from '../argv.ts';

describe('buildGeminiArgv', () => {
  it('builds the base stream-json argv with no prompt element', () => {
    expect(buildGeminiArgv()).toEqual(['--output-format', 'stream-json']);
  });

  it('maps each composer permission posture onto --approval-mode', () => {
    expect(
      buildGeminiArgv({
        permissionMode: CONVERSATION_PERMISSION_MODES.supervised,
      }),
    ).toEqual(['--output-format', 'stream-json', '--approval-mode', 'default']);
    expect(
      buildGeminiArgv({
        permissionMode: CONVERSATION_PERMISSION_MODES.autoAcceptEdits,
      }),
    ).toEqual([
      '--output-format',
      'stream-json',
      '--approval-mode',
      'auto_edit',
    ]);
    expect(
      buildGeminiArgv({
        permissionMode: CONVERSATION_PERMISSION_MODES.fullAccess,
      }),
    ).toEqual(['--output-format', 'stream-json', '--approval-mode', 'yolo']);
  });

  it('omits --approval-mode when no posture is selected', () => {
    expect(buildGeminiArgv({})).not.toContain('--approval-mode');
  });

  it('emits --model for a plain model and omits it for empty/auto', () => {
    expect(buildGeminiArgv({ model: 'gemini-2.5-pro' })).toEqual([
      '--output-format',
      'stream-json',
      '--model',
      'gemini-2.5-pro',
    ]);
    expect(buildGeminiArgv({ model: 'auto' })).not.toContain('--model');
    expect(buildGeminiArgv({ model: '  ' })).not.toContain('--model');
  });

  it('never emits the deprecated -p flag or a resume flag', () => {
    const argv = buildGeminiArgv({
      model: 'gemini-2.5-pro',
      permissionMode: CONVERSATION_PERMISSION_MODES.fullAccess,
    });
    expect(argv).not.toContain('-p');
    expect(argv).not.toContain('--prompt');
    expect(argv).not.toContain('--resume');
    expect(argv).not.toContain('-r');
  });

  it('exposes the discovery bin constants', () => {
    expect(GEMINI_BIN_ENV).toBe('OPENTHROTTLE_GEMINI_BIN');
    expect(GEMINI_DEFAULT_BIN).toBe('gemini');
  });
});
