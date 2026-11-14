/**
 * @description Unit tests for ServerInfoService: the version is the server package.json's, read
 * from disk rather than hardcoded.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ServerInfoService } from './server-info.service.ts';

const readPackageVersion = (): unknown => {
  const manifest: unknown = JSON.parse(
    readFileSync(
      join(import.meta.dirname, '..', '..', '..', 'package.json'),
      'utf8',
    ),
  );

  if (
    typeof manifest === 'object' &&
    manifest !== null &&
    'version' in manifest
  ) {
    return manifest.version;
  }

  return undefined;
};

describe('ServerInfoService', () => {
  let service: ServerInfoService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ServerInfoService],
    }).compile();

    service = moduleRef.get<ServerInfoService>(ServerInfoService);
  });

  it('reports the version field of applications/openthrottle-server/package.json', () => {
    expect(service.getServerInfo().version).toBe(readPackageVersion());
  });
});
