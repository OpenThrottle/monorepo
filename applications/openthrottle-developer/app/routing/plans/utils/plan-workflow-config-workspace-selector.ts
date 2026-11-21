/**
 * @description Select-value encoding + label helper for
 * {@link PlanWorkflowConfigWorkspaceSelector}. A single select mixes four kinds
 * of choice, so options are encoded as `root` | `custom` |
 * `checkout:<id>` | `repo:<id>`. Hoisted out of the component per
 * component-primitive-shape R4.
 */

import { PLAN_RUN_WORKSPACE_SELECTOR_COPY } from '~/routing/plans/data/data.copy';

export const ROOT_VALUE = 'root';
export const CUSTOM_VALUE = 'custom';
export const CHECKOUT_PREFIX = 'checkout:';
export const REPOSITORY_PREFIX = 'repo:';

export interface WorkspaceSelectedValueInput {
  readonly checkoutId: string;
  readonly repositoryId: string;
  readonly workingDirectory: string;
}

/** @description Encodes the checkoutId → repositoryId → workingDirectory precedence as a select value. */
export const getWorkspaceSelectedValue = (
  input: WorkspaceSelectedValueInput,
): string => {
  const { checkoutId, repositoryId, workingDirectory } = input;

  if (checkoutId !== '') return `${CHECKOUT_PREFIX}${checkoutId}`;
  if (repositoryId !== '') return `${REPOSITORY_PREFIX}${repositoryId}`;
  if (workingDirectory.trim() !== '') return CUSTOM_VALUE;
  return ROOT_VALUE;
};

/** @description Last path segment (repo folder name), for a friendly checkout label. */
export const basename = (path: string): string => {
  const trimmed = path.replace(/\/+$/, '');
  const segments = trimmed.split('/');
  return segments[segments.length - 1] || trimmed;
};

export interface WorkspaceCheckoutLabelInput {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly inspection?: {
    readonly git?: { readonly currentBranch?: string | null } | null;
  } | null;
}

/** @description The text a checkout `SelectItem` renders (name, plus branch when known). */
export const getWorkspaceCheckoutLabel = (
  checkout: WorkspaceCheckoutLabelInput,
): string => {
  const name = checkout.displayName || basename(checkout.filesystemPath);
  const branch = checkout.inspection?.git?.currentBranch;
  return branch ? `${name} · ${branch}` : name;
};

/**
 * @description The text the selected `SelectItem` renders, so the trigger can show it in
 * server markup (Radix only fills `SelectValue` once the items mount on the client).
 */
export const getWorkspaceSelectedLabel = (
  selectedValue: string,
  selectedCheckout: WorkspaceCheckoutLabelInput | undefined,
): string => {
  if (selectedValue === CUSTOM_VALUE) {
    return PLAN_RUN_WORKSPACE_SELECTOR_COPY.customPathOption;
  }
  if (selectedValue.startsWith(REPOSITORY_PREFIX)) {
    return PLAN_RUN_WORKSPACE_SELECTOR_COPY.anyCheckoutOption;
  }
  if (selectedValue.startsWith(CHECKOUT_PREFIX) && selectedCheckout) {
    return getWorkspaceCheckoutLabel(selectedCheckout);
  }
  return PLAN_RUN_WORKSPACE_SELECTOR_COPY.rootOption;
};
