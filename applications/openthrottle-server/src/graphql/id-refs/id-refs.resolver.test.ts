/**
 * @description Unit tests for IdRefsResolver: it delegates to IdRefsService.
 */

import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ID_REF_KIND } from './id-refs.enum.ts';
import { IdRefsResolver } from './id-refs.resolver.ts';
import { IdRefsService } from './id-refs.service.ts';

describe('IdRefsResolver', () => {
  let resolver: IdRefsResolver;
  const resolve = vi.fn();

  beforeEach(async () => {
    resolve.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        IdRefsResolver,
        { provide: IdRefsService, useValue: { resolve } },
      ],
    }).compile();

    resolver = moduleRef.get(IdRefsResolver);
  });

  it('returns the refs the service resolves for the given ref', async () => {
    const refs = [
      {
        id: '1e5089b4-94f1-449b-8d80-4edd82c47037',
        kind: ID_REF_KIND.PLAN,
        planId: null,
        planTitle: null,
        status: 'PENDING',
        title: 'Plan',
      },
    ];
    resolve.mockResolvedValue(refs);

    await expect(resolver.resolveIdRef('1e5089b4')).resolves.toEqual(refs);
    expect(resolve).toHaveBeenCalledWith('1e5089b4');
  });
});
