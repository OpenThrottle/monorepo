/**
 * @description Shared GraphQL Codegen surface for OpenThrottle packages and apps.
 * Re-exports the `CodegenConfig` type so consuming `codegen.ts` files share a single
 * import path for the shared config factory. The single hoisted dependency set is
 * enforced by the pnpm catalog (`pnpm-workspace.yaml`) and root `package.json`, not by
 * this package.
 */
export type { CodegenConfig } from '@graphql-codegen/cli';
