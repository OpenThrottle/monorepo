/**
 * @description GraphQL shapes for a cms layout and its fragment tree. The tree is a flat,
 * pre-order list of node occurrences linked by `key` / `parentKey` / `childKeys` rather than a
 * recursive type, so a client selects it once instead of nesting a selection per level, and the
 * result is a tree by construction even when fragments are shared or the stored graph cycles.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `One occurrence of a cms fragment in a layout tree. A fragment shared by two parents appears twice, with different keys.`,
})
export class CmsFragmentNodeObject {
  @Field(() => [String], {
    description: `Keys of this occurrence's children, ordered by fragments_children.sort_order. Always a list; empty for a leaf.`,
  })
  childKeys!: string[];

  @Field(() => Int, { description: `0 for the layout's root fragment.` })
  depth!: number;

  @Field(() => Boolean)
  isSystem!: boolean;

  @Field(() => String, {
    description: `Unique per occurrence: the uuid path from the root, joined by "/".`,
  })
  key!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: `Key of the parent occurrence; null for the root.`,
    nullable: true,
  })
  parentKey!: string | null;

  @Field(() => Int, {
    description: `sort_order of the edge from the parent; 0 for the root.`,
  })
  position!: number;

  @Field(() => String, {
    description: `The fragment's properties as a JSON object string (repo convention: no JSON scalar).`,
  })
  propertiesJson!: string;

  @Field(() => String, {
    description: `The schema the properties validate against.`,
  })
  schemaUuid!: string;

  @Field(() => String, {
    description: `Content type; selects the component that renders the fragment.`,
  })
  typename!: string;

  @Field(() => String, { description: `The fragment's uuid.` })
  uuid!: string;
}

@ObjectType({
  description: `A cms layout: a publishable page addressed by slug, with its fragment tree.`,
})
export class CmsLayoutObject {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => [CmsFragmentNodeObject], {
    description: `The live fragment tree in pre-order (root first, each node before its children). Cut below depth 10; soft-deleted fragments and their subtrees are left out.`,
  })
  fragments!: CmsFragmentNodeObject[];

  @Field(() => String, { description: `uuid of the root fragment.` })
  fragmentUuid!: string;

  @Field(() => String, {
    description: `Layout metadata as a JSON object string.`,
  })
  metadataJson!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String, {
    description: `ACTIVE | DISABLED | DRAFT`,
    nullable: true,
  })
  status!: string | null;

  @Field(() => [String])
  tags!: string[];

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String)
  uuid!: string;
}

@ObjectType({
  description: `A cms layout without its fragment tree, for lists and write results.`,
})
export class CmsLayoutSummaryObject {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { description: `uuid of the root fragment.` })
  fragmentUuid!: string;

  @Field(() => String, {
    description: `Layout metadata as a JSON object string.`,
  })
  metadataJson!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String, {
    description: `ACTIVE | DISABLED | DRAFT`,
    nullable: true,
  })
  status!: string | null;

  @Field(() => [String])
  tags!: string[];

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => String)
  uuid!: string;
}

@ObjectType({ description: `One page of live cms layouts, oldest first.` })
export class CmsLayoutListResult {
  @Field(() => Boolean)
  hasNextPage!: boolean;

  @Field(() => [CmsLayoutSummaryObject])
  items!: CmsLayoutSummaryObject[];

  @Field(() => Int)
  totalCount!: number;
}
