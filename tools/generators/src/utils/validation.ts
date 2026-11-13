export const REGEX_CAMEL_CASE = /^[a-z]+(?:[A-Z][a-z]+)*$/;
export const REGEX_PASCAL_CASE = /^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/;
/** Allows PascalCase plus trailing version-style segments (e.g. HomeHeroV1). */
export const REGEX_PASCAL_CASE_V2 = /^[A-Z][a-z]+(?:[A-Z](?:[a-z]+|[0-9]+))*$/;
export const REGEX_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The package organization scopes available across the workspace. This is the
 * single source of truth shared by the package generator's `--describe` /
 * `--list=organizations` output, its schema validation, and the interactive
 * prompt — keep them in sync by importing from here.
 */
export const ORGANIZATIONS = ['@openthrottle', '@tools'] as const;

export const validateSlug = (value: string): string | undefined => {
  if (value.length < 3) return 'Must be at least 3 characters';
  if (!REGEX_SLUG.test(value)) {
    return 'Must be a slug (lowercase, hyphen-separated)';
  }
  return undefined;
};

export const validatePascalCase = (value: string): string | undefined => {
  if (value.length < 3) return 'Must be at least 3 characters';
  if (!REGEX_PASCAL_CASE_V2.test(value)) return 'Must be pascal case';
  return undefined;
};

export const validateCamelCase = (value: string): string | undefined => {
  if (value.length < 3) return 'Must be at least 3 characters';
  if (!REGEX_CAMEL_CASE.test(value)) return 'Must be camel case';
  return undefined;
};

export const validatePort = (value: number): string | undefined => {
  if (value < 4000 || value > 9999) return 'Port must be between 4000 and 9999';
  return undefined;
};
