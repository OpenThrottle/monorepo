import { ALL_DRIVERS } from '@openthrottle/openthrottle-drivers';
import { describe, expect, it } from 'vitest';

import { CONVERSATION_CLI_BACKENDS } from '../registry.ts';

/**
 * The drift guard: the routing registry (which the server derives `CLI_BACKENDS`
 * from) and each driver's `capabilities.chatStreaming` flag (which feeds
 * `chatCapable` → the composer + the resolver's accepted-backend allowlist) MUST
 * agree. If they diverge, a driver could be OFFERED as a chat backend but route
 * to the wrong (openai) backend, or vice versa. Adding a streaming backend means
 * touching both — this test makes forgetting either half a loud failure.
 */
describe('CONVERSATION_CLI_BACKENDS ⟺ chatStreaming drift guard', () => {
  it('has a backend for exactly the drivers whose chatStreaming is true', () => {
    const registryIds = Object.keys(CONVERSATION_CLI_BACKENDS).sort();
    const chatStreamingIds = ALL_DRIVERS.filter(
      (driver) => driver.capabilities.chatStreaming,
    )
      .map((driver) => driver.id)
      .sort();

    expect(registryIds).toEqual(chatStreamingIds);
  });

  it('keys every backend by a real driver id', () => {
    const driverIds = new Set(ALL_DRIVERS.map((driver) => driver.id));
    for (const id of Object.keys(CONVERSATION_CLI_BACKENDS)) {
      expect(driverIds.has(id)).toBe(true);
    }
  });

  it('registers codex and grok (this plan) as chat backends', () => {
    expect(CONVERSATION_CLI_BACKENDS).toHaveProperty('codex');
    expect(CONVERSATION_CLI_BACKENDS).toHaveProperty('grok');
  });

  it('exposes each backend as a streamable ConversationBackend', () => {
    for (const backend of Object.values(CONVERSATION_CLI_BACKENDS)) {
      expect(typeof backend.stream).toBe('function');
    }
  });
});
