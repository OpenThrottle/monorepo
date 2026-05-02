import { describe, expect, it } from 'vitest';
import { globalClsUserFromJwtLike } from './global-cls-user';

describe('globalClsUserFromJwtLike', () => {
  it('maps sub to uuid and uses email for displayName when email present', () => {
    const result = globalClsUserFromJwtLike({
      email: 'ada@example.com',
      sub: 'user-uuid',
    });

    expect(result).toEqual({
      displayName: 'ada@example.com',
      email: 'ada@example.com',
      isDeleted: false,
      permissions: undefined,
      roles: [],
      uuid: 'user-uuid',
    });
  });

  it('uses sub as displayName when email is absent', () => {
    const result = globalClsUserFromJwtLike({ sub: 'only-sub' });

    expect(result.displayName).toBe('only-sub');
    expect(result.email).toBe('');
    expect(result.uuid).toBe('only-sub');
    expect(result.roles).toEqual([]);
  });

  it('copies roles from JWT payload', () => {
    const result = globalClsUserFromJwtLike({
      roles: ['admin', 'viewer'],
      sub: 'u1',
    });

    expect(result.roles).toEqual(['admin', 'viewer']);
  });
});
