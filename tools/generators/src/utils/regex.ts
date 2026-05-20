export const REGEX_CAMEL_CASE = /^[a-z]+(?:[A-Z][a-z]+)*$/;
export const REGEX_PASCAL_CASE = /^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/;
/** Allows PascalCase plus trailing version-style segments (e.g. HomeHeroV1). */
export const REGEX_PASCAL_CASE_V2 = /^[A-Z][a-z]+(?:[A-Z](?:[a-z]+|[0-9]+))*$/;
export const REGEX_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
