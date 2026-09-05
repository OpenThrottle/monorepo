/**
 * @description Unit tests for work-session client attribution: the connected client's name and
 * version win over this server's own, a surface that never captured (Nest/HTTP) or a handshake
 * that has not completed falls back cleanly, a throwing provider can never fail a tool call, and
 * the model comes only from an explicit env var — never inferred.
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
});
