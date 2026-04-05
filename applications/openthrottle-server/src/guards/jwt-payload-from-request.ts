/**
 * @description Reads Passport `request.user` as {@link JwtPayload} without type assertions.
 */

import type { JwtPayload } from '@openthrottle/nestjs-auth';

const parseOptionalStringArray = (
  value: unknown,
): readonly string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const out: string[] = [];

  for (const item of value) {
    if (typeof item !== 'string') {
      return undefined;
    }

    out.push(item);
  }

  return out;
};

/**
 * @description Returns the JWT payload from an HTTP-like request object,
 * or undefined if missing/invalid.
 */
export const getJwtPayloadFromRequest = (
  req: unknown,
): JwtPayload | undefined => {
  if (typeof req !== 'object' || req === null || !('user' in req)) {
    return undefined;
  }

  const userUnknown: unknown = Reflect.get(req, 'user');

  if (userUnknown == null || typeof userUnknown !== 'object') {
    return undefined;
  }

  const subUnknown: unknown = Reflect.get(userUnknown, 'sub');

  if (typeof subUnknown !== 'string') {
    return undefined;
  }

  const emailUnknown: unknown = Reflect.get(userUnknown, 'email');
  const expUnknown: unknown = Reflect.get(userUnknown, 'exp');
  const iatUnknown: unknown = Reflect.get(userUnknown, 'iat');
  const rolesUnknown: unknown = Reflect.get(userUnknown, 'roles');

  const roles = parseOptionalStringArray(rolesUnknown);

  return {
    sub: subUnknown,
    ...(typeof emailUnknown === 'string' ? { email: emailUnknown } : {}),
    ...(roles !== undefined ? { roles } : {}),
    ...(typeof expUnknown === 'number' ? { exp: expUnknown } : {}),
    ...(typeof iatUnknown === 'number' ? { iat: iatUnknown } : {}),
  };
};
