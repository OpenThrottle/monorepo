/**
 * @description Unit tests for work-session client attribution: the connected client's name and
 * version win over this server's own, a surface that never captured (Nest/HTTP) or a handshake
 * that has not completed falls back cleanly, a throwing provider can never fail a tool call, and
 * the model comes only from a caller's declaration or an explicit env var — never inferred.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  captureClientIdentityProvider,
  getClientIdentity,
  resolveSessionModel,
  resolveSessionToolName,
  resolveSessionToolVersion,
} from './client-identity.ts';

const FALLBACK_VERSION = '1.0.0';

describe('client identity capture', () => {
  afterEach(() => {
    captureClientIdentityProvider(null);
  });

  it('reports nothing captured on a surface that never captured (Nest/HTTP)', () => {
    expect(getClientIdentity()).toBeNull();
    expect(resolveSessionToolName()).toBe('openthrottle-mcp');
    expect(resolveSessionToolVersion(FALLBACK_VERSION)).toBe(FALLBACK_VERSION);
  });

  it('reports the connected client once the handshake has completed', () => {
    captureClientIdentityProvider(() => ({
      name: 'claude-code',
      version: '2.4.1',
    }));

    expect(resolveSessionToolName()).toBe('claude-code');
    expect(resolveSessionToolVersion(FALLBACK_VERSION)).toBe('2.4.1');
  });

  it('falls back while the handshake is still pending', () => {
    captureClientIdentityProvider(() => null);

    expect(resolveSessionToolName()).toBe('openthrottle-mcp');
    expect(resolveSessionToolVersion(FALLBACK_VERSION)).toBe(FALLBACK_VERSION);
  });

  it('ignores a client that reports a blank name', () => {
    captureClientIdentityProvider(() => ({ name: '   ', version: '9.9.9' }));

    expect(getClientIdentity()).toBeNull();
    expect(resolveSessionToolName()).toBe('openthrottle-mcp');
  });

  it('never lets a throwing provider fail the caller', () => {
    captureClientIdentityProvider(() => {
      throw new Error('handshake exploded');
    });

    expect(getClientIdentity()).toBeNull();
    expect(resolveSessionToolName()).toBe('openthrottle-mcp');
  });
});

describe('resolveSessionModel', () => {
  beforeEach(() => {
    delete process.env.OPENTHROTTLE_MCP_MODEL;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_MODEL;
  });

  it('reports null when the launcher set no model, rather than guessing one', () => {
    expect(resolveSessionModel()).toBeNull();
  });

  it('reports the model the launcher set', () => {
    process.env.OPENTHROTTLE_MCP_MODEL = 'claude-opus-5';

    expect(resolveSessionModel()).toBe('claude-opus-5');
  });

  it('trims the model, and treats a blank one as unset', () => {
    process.env.OPENTHROTTLE_MCP_MODEL = '  claude-fable-5  ';
    expect(resolveSessionModel()).toBe('claude-fable-5');

    process.env.OPENTHROTTLE_MCP_MODEL = '   ';
    expect(resolveSessionModel()).toBeNull();
  });

  it("reports the caller's declared model when the launcher set none", () => {
    expect(resolveSessionModel('claude-sonnet-5')).toBe('claude-sonnet-5');
  });

  it('prefers the declared model over the launcher env var', () => {
    // The whole point of the declared rung: one process serves a whole loop, so the env var
    // cannot express a per-task decision and must not win over one.
    process.env.OPENTHROTTLE_MCP_MODEL = 'claude-opus-5';

    expect(resolveSessionModel('claude-sonnet-5')).toBe('claude-sonnet-5');
  });

  it('falls back to the env var when the declaration is absent or blank', () => {
    process.env.OPENTHROTTLE_MCP_MODEL = 'claude-opus-5';

    expect(resolveSessionModel()).toBe('claude-opus-5');
    expect(resolveSessionModel(null)).toBe('claude-opus-5');
    expect(resolveSessionModel(undefined)).toBe('claude-opus-5');
    expect(resolveSessionModel('   ')).toBe('claude-opus-5');
  });

  it('trims a declared model', () => {
    expect(resolveSessionModel('  claude-fable-5  ')).toBe('claude-fable-5');
  });

  it('reports null when neither rung supplies one, rather than guessing', () => {
    expect(resolveSessionModel(null)).toBeNull();
    expect(resolveSessionModel('  ')).toBeNull();
  });
});

describe('the HTTP/Nest surface reports no client and no model', () => {
  /**
   * The Nest surface multiplexes many callers over one process, so it never captures a client
   * identity and the launcher sets no per-caller model. It must resolve to nothing rather than
   * to another caller's value — the same surface split workspace-path.ts uses. Adding the
   * declared rung must not create an ambient channel that leaks across callers.
   */
  beforeEach(() => {
    captureClientIdentityProvider(null);
    delete process.env.OPENTHROTTLE_MCP_MODEL;
  });

  afterEach(() => {
    delete process.env.OPENTHROTTLE_MCP_MODEL;
  });

  it('resolves to no client and no model with nothing captured and nothing declared', () => {
    expect(getClientIdentity()).toBeNull();
    expect(resolveSessionToolName()).toBe('openthrottle-mcp');
    expect(resolveSessionToolVersion(FALLBACK_VERSION)).toBe(FALLBACK_VERSION);
    expect(resolveSessionModel()).toBeNull();
  });

  it('keeps a declared model per-call, never stored for the next caller', () => {
    expect(resolveSessionModel('claude-sonnet-5')).toBe('claude-sonnet-5');

    // The next caller declares nothing and must not inherit the previous one's model.
    expect(resolveSessionModel()).toBeNull();
  });
});
