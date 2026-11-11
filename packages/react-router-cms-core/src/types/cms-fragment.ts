/**
 * @description A node in a CMS layout tree. `typename` maps to the React component that renders
 * it and to the schema its `properties` validate against. Upstream allowed `children` to be a
 * single fragment or an array; here it is always an array — an empty one for a leaf.
 * @public
 */
export interface CmsFragment {
  readonly children: readonly CmsFragment[];
  readonly properties: Readonly<Record<string, unknown>>;
  readonly typename: string;
  readonly uuid: string;
}
