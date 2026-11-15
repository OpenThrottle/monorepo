/**
 * @description Tests for ModelDiscoveryResolver: maps the cached DiscoveryResult from the injected
 * NestjsModelDiscoveryService into the ListResult-style payload (endpoints + totalCount +
 * scannedHosts/scannedAt), and declares the cache hints that keep the operation cacheable. The
 * service is mocked — no network.
 */

import { createMock } from '@golevelup/ts-vitest';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import type { NestjsModelDiscoveryService } from '@openthrottle/nestjs-model-discovery';
import type { DiscoveryResult } from '@openthrottle/openthrottle-agentic-utils';
import type { GraphQLSchema } from 'graphql';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { MODEL_DISCOVERY_CACHE_HINT } from './model-discovery.constants.ts';
import { ModelDiscoveryResolver } from './model-discovery.resolver.ts';

const SNAPSHOT: DiscoveryResult = {
  endpoints: [
    {
      baseUrl: 'http://localhost:11434/v1',
      host: 'localhost',
      models: ['llama3', 'qwen'],
      port: 11434,
      provider: 'ollama',
    },
    {
      baseUrl: 'http://localhost:8000/v1',
      host: 'localhost',
      models: ['vllm-model'],
      port: 8000,
      provider: null,
    },
  ],
  scannedAt: '2026-06-14T00:00:00.000Z',
  scannedHosts: ['localhost', 'host.docker.internal'],
};

/**
 * The extension values of a field off a built schema, failing the test when it
 * is missing. Checked structurally: `isObjectType` from this test's `graphql`
 * copy rejects types built by Nest's copy ("from another module or realm").
 */
const getFieldExtensionValues = (
  schema: GraphQLSchema,
  typeName: string,
  fieldName: string,
): unknown[] => {
  const type = schema.getType(typeName);

  if (type === undefined || !('getFields' in type)) {
    throw new Error(`expected ${typeName} to be an object type`);
  }

  const field = type.getFields()[fieldName];

  if (field === undefined) {
    throw new Error(`expected ${typeName}.${fieldName} to exist`);
  }

  return Object.values(field.extensions);
};

describe('ModelDiscoveryResolver', () => {
  let service: NestjsModelDiscoveryService;
  let resolver: ModelDiscoveryResolver;

  beforeEach(() => {
    service = createMock<NestjsModelDiscoveryService>();
    vi.mocked(service.discover).mockResolvedValue(SNAPSHOT);
    resolver = new ModelDiscoveryResolver(service);
  });

  it('reads the cached snapshot (no forceRefresh) and maps the payload', async () => {
    const result = await resolver.discoverLocalModels();
    expect(service.discover).toHaveBeenCalledWith();
    expect(result.totalCount).toBe(2);
    expect(result.scannedAt).toBe('2026-06-14T00:00:00.000Z');
    expect(result.scannedHosts).toEqual(['localhost', 'host.docker.internal']);
    expect(result.endpoints).toHaveLength(2);
    expect(result.endpoints[0]).toEqual({
      baseUrl: 'http://localhost:11434/v1',
      host: 'localhost',
      models: ['llama3', 'qwen'],
      port: 11434,
      provider: 'ollama',
    });
    expect(result.endpoints[1]?.provider).toBeNull();
  });

  it('returns an empty payload when nothing is discovered', async () => {
    vi.mocked(service.discover).mockResolvedValue({
      endpoints: [],
      scannedAt: '2026-06-14T00:00:00.000Z',
      scannedHosts: ['localhost'],
    });
    const result = await resolver.discoverLocalModels();
    expect(result.totalCount).toBe(0);
    expect(result.endpoints).toEqual([]);
  });

  describe('cache hints', () => {
    let schema: GraphQLSchema;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [GraphQLSchemaBuilderModule],
      }).compile();
      schema = await moduleRef
        .get(GraphQLSchemaFactory)
        .create([ModelDiscoveryResolver]);
    });

    it('hints the query as cacheable for 60s, per user', () => {
      expect(MODEL_DISCOVERY_CACHE_HINT).toEqual({
        maxAge: 60,
        scope: 'PRIVATE',
      });
      expect(
        getFieldExtensionValues(schema, 'Query', 'discoverLocalModels'),
      ).toContainEqual(MODEL_DISCOVERY_CACHE_HINT);
    });

    it('hints the object-typed endpoints field so the operation stays cacheable', () => {
      expect(
        getFieldExtensionValues(
          schema,
          'DiscoverLocalModelsResult',
          'endpoints',
        ),
      ).toContainEqual(MODEL_DISCOVERY_CACHE_HINT);
    });
  });
});
