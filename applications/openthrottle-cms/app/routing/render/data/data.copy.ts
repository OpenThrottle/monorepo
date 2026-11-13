/**
 * @description Single-sourced user-facing copy for the render routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const RENDER_COPY = {
  apiError: `The CMS API could not be reached, so this layout cannot be shown right now.`,
  breadcrumb: `Render`,
  notFound: `No layout has this slug, or it was deleted.`,
  title: `Render`,
} as const;
