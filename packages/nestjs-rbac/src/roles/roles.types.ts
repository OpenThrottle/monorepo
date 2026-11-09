import type { PERMISSIONS, ROLES } from './roles.constants.ts';
/** Role type (one of the keys of ROLES). */
export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Permission type (one of the values of PERMISSIONS). */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
