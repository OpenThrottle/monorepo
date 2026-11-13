import type { CmsFragment } from '@openthrottle/react-router-cms-core';

/**
 * @description The fields of a `cmsLayout` tree node that rendering needs.
 */
export interface CmsFragmentNodeInput {
  readonly childKeys: readonly string[];
  readonly key: string;
  /** Optional because codegen emits nullable GraphQL fields as optional members. */
  readonly parentKey?: string | null | undefined;
  readonly propertiesJson: string;
  readonly typename: string;
  readonly uuid: string;
}

/**
 * @description Reads a node's `propertiesJson` as an object; anything else (malformed JSON, an
 * array, a scalar) is an empty object, so one bad row renders with defaults instead of failing
 * the page.
 */
function parseProperties(json: string): Readonly<Record<string, unknown>> {
  let value: unknown;

  try {
    value = JSON.parse(json);
  } catch {
    return {};
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}

/**
 * @description Rebuilds the `cmsLayout` flat node list into the `CmsFragment` tree cms-core
 * renders: the roots (nodes without a parent), each with its children in `childKeys` order. A
 * child key with no node is skipped, and `children` is always a list.
 */
export function toCmsFragments(
  nodes: readonly CmsFragmentNodeInput[],
): CmsFragment[] {
  const byKey = new Map(
    nodes.map((node) => {
      return [node.key, node] as const;
    }),
  );
  const build = (node: CmsFragmentNodeInput): CmsFragment => {
    const children = node.childKeys.flatMap((key) => {
      const child = byKey.get(key);

      return child ? [build(child)] : [];
    });

    return {
      children,
      properties: parseProperties(node.propertiesJson),
      typename: node.typename,
      uuid: node.uuid,
    };
  };

  return nodes
    .filter((node) => {
      return node.parentKey === null || node.parentKey === undefined;
    })
    .map(build);
}
