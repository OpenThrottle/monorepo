/**
 * @description Permission names the developer app gates UI and loaders on.
 * Mirrors the server's RBAC `PERMISSIONS` map (`@openthrottle/nestjs-rbac`),
 * which is a server package and must not be imported into the client bundle.
 * Add an entry here only when a UI surface or loader actually checks it; the
 * server stays the authority (the `Permissions` guard on every resolver).
 */
export const PERMISSIONS = {
  BLOG_DRAFT: 'blog:draft',
  BLOG_WRITE: 'blog:write',
} as const;

/** One of the permission names in {@link PERMISSIONS}. */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** React Router id of the root route, whose loader carries `permissions`. */
export const ROOT_ROUTE_ID = 'root';
