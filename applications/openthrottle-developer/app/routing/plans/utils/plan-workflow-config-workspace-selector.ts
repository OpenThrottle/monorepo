/**
 * @description Select-value encoding + label helper for
 * {@link PlanWorkflowConfigWorkspaceSelector}. A single select mixes four kinds
 * of choice, so options are encoded as `root` | `custom` |
 * `checkout:<id>` | `repo:<id>`. Hoisted out of the component per
 * component-primitive-shape R4.
 */

export const ROOT_VALUE = 'root';
export const CUSTOM_VALUE = 'custom';
export const CHECKOUT_PREFIX = 'checkout:';
export const REPOSITORY_PREFIX = 'repo:';

/** @description Last path segment (repo folder name), for a friendly checkout label. */
export const basename = (path: string): string => {
  const trimmed = path.replace(/\/+$/, '');
  const segments = trimmed.split('/');
  return segments[segments.length - 1] || trimmed;
};
