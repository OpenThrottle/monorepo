import type * as React from 'react';

import type { CmsFragment } from './cms-fragment';
import type { CmsParsedSchema } from './cms-json-schema';
import type { CmsFragmentRecord } from './cms-records';

/**
 * @description What the renderer hands a registered component: the fragment's stored
 * `properties`, still untrusted JSON, and its already-rendered children.
 * @public
 */
export interface CmsRenderProps {
  readonly children: React.ReactNode;
  readonly properties: Readonly<Record<string, unknown>>;
}

/**
 * @description A component the renderer can mount for a fragment `typename`. It reads its own props
 * out of {@link CmsRenderProps.properties}, so a block with required props narrows them itself
 * rather than trusting the stored JSON.
 * @public
 */
export type CmsRegisteredComponent = React.ComponentType<CmsRenderProps>;

/**
 * @description Fragment `typename` → the component that renders it.
 * @public
 */
export type CmsComponentRegistry = Readonly<
  Record<string, CmsRegisteredComponent>
>;

/**
 * @description Renders one node of a fragment tree at a given depth. Replaces upstream
 * `RocketBaseComponentProps.renderUnknown`.
 * @public
 */
export type CmsRenderUnknown = (
  fragment: CmsFragment,
  depth: number,
) => React.ReactNode;

/**
 * @description The selected fragment's in-progress `properties`, edited by the form fields before
 * they are saved.
 * @public
 */
export type CmsFragmentDraft = Readonly<Record<string, unknown>>;

/**
 * @description Validation messages for a fragment form, keyed by top-level property name. The app
 * maps its server's issues into this; the package only displays them.
 * @public
 */
export type CmsFormIssues = Readonly<Record<string, readonly string[]>>;

/**
 * @description What {@link CoreFormContext} supplies to the fields of one fragment form.
 * @public
 */
export interface CmsFormContextValue {
  readonly fragmentUuid: string;
  readonly schema: CmsParsedSchema;
}

/**
 * @description What the `children` field of a fragment form needs from the app: the child rows,
 * where to edit or add one, and how to persist a removal or a new order. The package holds no
 * routes or form intents of its own.
 * @public
 */
export interface CmsFormChildren {
  /** Where "add children" goes — typically a route or modal search param in the app. */
  readonly addHref: string;
  readonly fragments: readonly CmsFragmentRecord[];
  readonly getFragmentHref: (fragment: CmsFragmentRecord) => string;
  readonly onRemove: (fragment: CmsFragmentRecord) => void;
  /** Called with the new order; the list is controlled, so apply it to `fragments`. */
  readonly onReorder: (fragments: readonly CmsFragmentRecord[]) => void;
}
