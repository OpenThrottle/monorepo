/**
 * @description Unit tests for ServerInfoResolver: delegates to the service.
 */

import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ServerInfoResolver } from './server-info.resolver.ts';
import { ServerInfoService } from './server-info.service.ts';

describe('ServerInfoResolver', () => {
  let resolver: ServerInfoResolver;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ServerInfoResolver,
        {
          provide: ServerInfoService,
          useValue: { getServerInfo: () => ({ version: '9.9.9' }) },
        },
      ],
    }).compile();

    resolver = moduleRef.get<ServerInfoResolver>(ServerInfoResolver);
  });

  it('returns the version from the service', () => {
    expect(resolver.serverInfo()).toEqual({ version: '9.9.9' });
  });
});
