import { REGEX_CAMEL_CASE, REGEX_PASCAL_CASE_V2, REGEX_SLUG } from './regex';

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
