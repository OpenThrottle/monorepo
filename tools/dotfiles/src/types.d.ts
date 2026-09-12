// No ambient ESLint-plugin shims are needed any more: every plugin the shared
// config imports ships its own type declarations. Kept as a global script (no
// top-level import/export) so reintroducing a `declare module` here still works.
