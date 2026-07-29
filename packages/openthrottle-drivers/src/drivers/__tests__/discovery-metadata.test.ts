/**
 * @description Asserts every registered driver carries valid discovery metadata (binary, binEnv,
 * versionArgs, chatStreaming) and that each model-listing descriptor parses the real CLI output
 * shapes captured when the drivers were verified (2026-07-28). Guards against the registry and
 * discovery drifting apart.
 */

import { describe, expect, it } from 'vitest';

import {
  ALL_DRIVERS,
  claudeDriver,
  codexDriver,
  cursorDriver,
  grokDriver,
  opencodeDriver,
} from '../index.ts';

describe('driver discovery metadata', () => {
  it('every driver has a non-empty binary and versionArgs', () => {
    for (const driver of ALL_DRIVERS) {
      expect(driver.binary.length).toBeGreaterThan(0);
      expect(driver.versionArgs.length).toBeGreaterThan(0);
      // Every driver also declares its bin-env override so operators can pin a path.
      expect(driver.binEnv).toMatch(/^OPENTHROTTLE_.*_BIN$/);
    }
  });

  it('marks claude/cursor/opencode/codex/grok chat-capable (all have streaming adapters)', () => {
    const chatCapable = ALL_DRIVERS.filter(
      (driver) => driver.capabilities.chatStreaming,
    ).map((driver) => driver.id);
    expect(chatCapable.sort()).toEqual([
      'claude',
      'codex',
      'cursor',
      'grok',
      'opencode',
    ]);

    expect(codexDriver.capabilities.chatStreaming).toBe(true);
    expect(grokDriver.capabilities.chatStreaming).toBe(true);
  });

  it('claude uses a static alias list (no machine-listable models command)', () => {
    expect(claudeDriver.discoverModels).toEqual({
      mode: 'static',
      models: ['opus', 'sonnet', 'haiku', 'fable'],
    });
  });

  it('codex has no model-listing descriptor (availability-only)', () => {
    expect(codexDriver.discoverModels).toBeUndefined();
  });

  it('cursor parses `<id> - <Label>` rows, skipping the header and blanks', () => {
    const listing = cursorDriver.discoverModels;
    expect(listing?.mode).toBe('command');
    if (listing?.mode !== 'command') throw new Error('expected command mode');
    expect(listing.argv).toEqual(['models']);
    expect(
      listing.parse(
        'Available models\n\nauto - Auto (current, default)\ngpt-5.2 - GPT-5.2\ncomposer-2.5 - Composer 2.5\n',
      ),
    ).toEqual(['auto', 'gpt-5.2', 'composer-2.5']);
    expect(listing.parse('unrecognized output')).toEqual([]);
  });

  it('opencode parses one `provider/model` id per line', () => {
    const listing = opencodeDriver.discoverModels;
    expect(listing?.mode).toBe('command');
    if (listing?.mode !== 'command') throw new Error('expected command mode');
    expect(listing.argv).toEqual(['models']);
    expect(
      listing.parse('opencode/big-pickle\nopencode/mimo-v2.5-free\n\n'),
    ).toEqual(['opencode/big-pickle', 'opencode/mimo-v2.5-free']);
  });

  it('grok parses bulleted models and strips the trailing (default)', () => {
    const listing = grokDriver.discoverModels;
    expect(listing?.mode).toBe('command');
    if (listing?.mode !== 'command') throw new Error('expected command mode');
    expect(listing.argv).toEqual(['models']);
    expect(
      listing.parse(
        'You are logged in with grok.com.\n\nDefault model: grok-4.5\n\nAvailable models:\n  * grok-4.5 (default)\n  * grok-4-fast\n',
      ),
    ).toEqual(['grok-4.5', 'grok-4-fast']);
    // Logged-out / unrecognized output degrades to [].
    expect(listing.parse('Not logged in')).toEqual([]);
  });
});
