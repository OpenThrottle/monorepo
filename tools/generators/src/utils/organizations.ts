/**
 * The package organization scopes available across the workspace. This is the
 * single source of truth shared by the package generator's `--describe` /
 * `--list=organizations` output, its schema validation, and the interactive
 * prompt — keep them in sync by importing from here.
 */
export const ORGANIZATIONS = ['@openthrottle', '@tools'] as const;
