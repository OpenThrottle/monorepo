// Ambient module shims for ESLint plugins that ship no type declarations.
// This file must remain a global script (no top-level import/export), otherwise
// these `declare module` statements become module augmentations that don't
// satisfy the resolver for bare imports in src/index.ts.
declare module 'eslint-plugin-eslint-comments';
declare module 'eslint-plugin-json';
declare module 'eslint-plugin-sort-keys-fix';
declare module 'eslint-plugin-typescript-sort-keys';
