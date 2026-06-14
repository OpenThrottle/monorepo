/**
 * @description Single-sourced user-facing copy for the <%= name %> routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const <%= nameUppercase %>_NOT_FOUND_COPY = {
  description: `The <%= nameSingular %> you're looking for doesn't exist or was removed.`,
  title: `<%= nameSingular %> not found`,
} as const;
