import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { nullIfNotFound } from './users.utils.ts';

describe('nullIfNotFound', () => {
  describe('when the write succeeds', () => {
    it('returns its value', async () => {
      await expect(nullIfNotFound(async () => 'row')).resolves.toBe('row');
    });
  });

  describe('when the write throws NotFoundException', () => {
    it('returns null', async () => {
      await expect(
        nullIfNotFound(async () => {
          throw new NotFoundException('missing');
        }),
      ).resolves.toBeNull();
    });
  });

  describe('when the write throws anything else', () => {
    it('rethrows it', async () => {
      await expect(
        nullIfNotFound(async () => {
          throw new BadRequestException('bad');
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
