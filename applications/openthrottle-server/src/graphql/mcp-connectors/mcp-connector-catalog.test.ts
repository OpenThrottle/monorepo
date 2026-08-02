import { describe, expect, it } from 'vitest';
import { MCP_CONNECTOR_AUTH_TYPES } from '@openthrottle/nestjs-repositories';
import {
  MCP_CONNECTOR_CATALOG,
  MCP_CONNECTOR_PROVIDERS,
  MCP_CONNECTOR_TRANSPORTS,
  findMcpConnector,
} from './mcp-connector-catalog';

describe('MCP_CONNECTOR_CATALOG', () => {
  it('seeds the curated top-10', () => {
    expect(MCP_CONNECTOR_CATALOG).toHaveLength(10);
  });

  it('has unique, non-empty, kebab-case keys', () => {
    const keys = MCP_CONNECTOR_CATALOG.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it('keeps entries alphabetized by key', () => {
    const keys = MCP_CONNECTOR_CATALOG.map((entry) => entry.key);
    expect(keys).toStrictEqual([...keys].sort());
  });

  it('tags every entry with a known provider, transport, and auth type', () => {
    for (const entry of MCP_CONNECTOR_CATALOG) {
      expect(MCP_CONNECTOR_PROVIDERS).toContain(entry.provider);
      expect(MCP_CONNECTOR_TRANSPORTS).toContain(entry.transport);
      expect(MCP_CONNECTOR_AUTH_TYPES).toContain(entry.authType);
    }
  });

  it('covers all three providers', () => {
    const providers = new Set(
      MCP_CONNECTOR_CATALOG.map((entry) => entry.provider),
    );
    expect(providers).toStrictEqual(new Set(MCP_CONNECTOR_PROVIDERS));
  });

  it('requires a name, category, description, and docs URL for each entry', () => {
    for (const entry of MCP_CONNECTOR_CATALOG) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.docsUrl).toMatch(/^https:\/\//);
    }
  });

  it('gives every remote transport an endpoint and local-stdio none', () => {
    for (const entry of MCP_CONNECTOR_CATALOG) {
      if (entry.transport === 'local-stdio') {
        expect(entry.endpointUrl).toBeNull();
      }
      if (entry.endpointUrl != null) {
        expect(entry.endpointUrl).toMatch(/^https:\/\//);
      }
    }
  });
});

describe('findMcpConnector', () => {
  it('resolves a seeded key', () => {
    expect(findMcpConnector('github')?.name).toBe('GitHub');
  });

  it('returns undefined for an unknown key', () => {
    expect(findMcpConnector('nope')).toBeUndefined();
  });
});
