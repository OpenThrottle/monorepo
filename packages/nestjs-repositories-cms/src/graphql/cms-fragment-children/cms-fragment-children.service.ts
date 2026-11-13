import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import { CMS_FRAGMENT_TREE_MAX_DEPTH } from '../cms-fragment-tree/cms-fragment-tree.constants.ts';
import {
  assertCmsUuid,
  createCmsGraphqlError,
} from '../cms-graphql/cms-graphql.utils.ts';
import type { CmsFragmentChildObject } from './cms-fragment-children.object.ts';
import {
  getCmsChildEdgeRefusal,
  getCmsReorderRefusal,
} from './cms-fragment-children.utils.ts';

/**
 * @description Edits the cms fragment tree's edges, each as its own mutation (RocketCMS folded
 * them into the fragment update). Every edit runs in one transaction on the cms connection,
 * locks the parent row so concurrent edits to one parent serialize, and stamps the parent's
 * `updated_at`.
 * @public
 */
@Injectable()
export class CmsFragmentChildrenService {
  constructor(
    @InjectDataSource(CMS_CONNECTION)
    private readonly dataSource: DataSource,
  ) {}

  /**
   * @description Adds `childUuid` under `parentUuid`, at `sortOrder` or after the last child.
   * @throws GraphQLError NOT_FOUND for a missing fragment, CONFLICT for an existing edge,
   * BAD_USER_INPUT for a cycle or a tree deeper than the cap.
   */
  async add(
    parentUuid: string,
    childUuid: string,
    sortOrder: number | null,
  ): Promise<CmsFragmentChildObject> {
    assertCmsUuid('parent fragment', parentUuid);
    assertCmsUuid('child fragment', childUuid);

    return this.dataSource.transaction(async (manager) => {
      await this.lockLive(manager, parentUuid, 'parent fragment');
      await this.lockLive(manager, childUuid, 'child fragment');

      const [existing] = await manager.query(
        `SELECT 1 FROM fragments_children WHERE fragment_uuid = $1 AND children_uuid = $2`,
        [parentUuid, childUuid],
      );

      if (existing) {
        throw createCmsGraphqlError(
          'CONFLICT',
          `"${childUuid}" is already a child of "${parentUuid}"`,
        );
      }

      const refusal = getCmsChildEdgeRefusal(
        await this.measure(manager, parentUuid, childUuid),
      );

      if (refusal) {
        throw createCmsGraphqlError(
          'BAD_USER_INPUT',
          `Adding "${childUuid}" under "${parentUuid}" ${refusal}`,
        );
      }

      const [inserted] = await manager.query(
        `INSERT INTO fragments_children (fragment_uuid, children_uuid, sort_order)
         VALUES ($1, $2, COALESCE($3, (
           SELECT COALESCE(max(sort_order) + 1, 0) FROM fragments_children WHERE fragment_uuid = $1
         )))
         RETURNING sort_order`,
        [parentUuid, childUuid, sortOrder],
      );

      await this.touch(manager, parentUuid);

      return {
        childUuid,
        parentUuid,
        sortOrder: Number(inserted?.sort_order ?? 0),
      };
    });
  }

  /**
   * @description Removes the edge; the child fragment itself is untouched.
   * @throws GraphQLError NOT_FOUND when there is no such edge.
   */
  async remove(
    parentUuid: string,
    childUuid: string,
  ): Promise<CmsFragmentChildObject> {
    assertCmsUuid('parent fragment', parentUuid);
    assertCmsUuid('child fragment', childUuid);

    return this.dataSource.transaction(async (manager) => {
      await this.lockLive(manager, parentUuid, 'parent fragment');

      const [deleted] = await manager.query(
        `DELETE FROM fragments_children WHERE fragment_uuid = $1 AND children_uuid = $2
         RETURNING sort_order`,
        [parentUuid, childUuid],
      );

      if (!deleted) {
        throw createCmsGraphqlError(
          'NOT_FOUND',
          `"${childUuid}" is not a child of "${parentUuid}"`,
        );
      }

      await this.touch(manager, parentUuid);

      return {
        childUuid,
        parentUuid,
        sortOrder: Number(deleted.sort_order ?? 0),
      };
    });
  }

  /**
   * @description Sets the parent's child order to `childUuids` (positions 0..n-1).
   * @throws GraphQLError BAD_USER_INPUT unless `childUuids` is exactly the current children.
   */
  async reorder(
    parentUuid: string,
    childUuids: readonly string[],
  ): Promise<CmsFragmentChildObject[]> {
    assertCmsUuid('parent fragment', parentUuid);

    return this.dataSource.transaction(async (manager) => {
      await this.lockLive(manager, parentUuid, 'parent fragment');

      const rows: unknown = await manager.query(
        `SELECT children_uuid FROM fragments_children WHERE fragment_uuid = $1`,
        [parentUuid],
      );
      const current = (Array.isArray(rows) ? rows : []).flatMap((row) => {
        const uuid: unknown = Reflect.get(Object(row), 'children_uuid');

        return typeof uuid === 'string' ? [uuid] : [];
      });
      const refusal = getCmsReorderRefusal(current, childUuids);

      if (refusal) {
        throw createCmsGraphqlError(
          'BAD_USER_INPUT',
          `The new order for "${parentUuid}" ${refusal}`,
        );
      }

      if (childUuids.length > 0) {
        await manager.query(
          `UPDATE fragments_children c
              SET sort_order = o.position - 1
             FROM unnest($2::uuid[]) WITH ORDINALITY AS o(children_uuid, position)
            WHERE c.fragment_uuid = $1 AND c.children_uuid = o.children_uuid`,
          [parentUuid, [...childUuids]],
        );
      }

      await this.touch(manager, parentUuid);

      return childUuids.map((childUuid, index) => {
        return { childUuid, parentUuid, sortOrder: index };
      });
    });
  }

  /**
   * @description Locks a live fragment row for the rest of the transaction.
   */
  private async lockLive(
    manager: EntityManager,
    uuid: string,
    label: string,
  ): Promise<void> {
    const [row] = await manager.query(
      `SELECT uuid FROM fragments WHERE uuid = $1 AND is_deleted IS NOT TRUE FOR UPDATE`,
      [uuid],
    );

    if (!row) {
      throw createCmsGraphqlError('NOT_FOUND', `No ${label} "${uuid}"`);
    }
  }

  /**
   * @description How deep the parent sits, how tall the child's subtree is, and whether the
   * child already reaches the parent. Both walks are path-guarded and bounded one past the cap,
   * so stored cycles terminate.
   */
  private async measure(
    manager: EntityManager,
    parentUuid: string,
    childUuid: string,
  ): Promise<{
    readonly childHeight: number;
    readonly childReachesParent: boolean;
    readonly parentDepth: number;
  }> {
    const limit = CMS_FRAGMENT_TREE_MAX_DEPTH + 1;
    const [below] = await manager.query(
      `WITH RECURSIVE d AS (
         SELECT $1::uuid AS uuid, 0 AS depth, ARRAY[$1::uuid] AS path
         UNION ALL
         SELECT c.children_uuid, d.depth + 1, d.path || c.children_uuid
           FROM d JOIN fragments_children c ON c.fragment_uuid = d.uuid
          WHERE d.depth < $3 AND NOT c.children_uuid = ANY (d.path)
       )
       SELECT max(depth)::int AS height, bool_or(uuid = $2::uuid) AS reaches FROM d`,
      [childUuid, parentUuid, limit],
    );
    const [above] = await manager.query(
      `WITH RECURSIVE a AS (
         SELECT $1::uuid AS uuid, 0 AS depth, ARRAY[$1::uuid] AS path
         UNION ALL
         SELECT c.fragment_uuid, a.depth + 1, a.path || c.fragment_uuid
           FROM a JOIN fragments_children c ON c.children_uuid = a.uuid
          WHERE a.depth < $2 AND NOT c.fragment_uuid = ANY (a.path)
       )
       SELECT max(depth)::int AS depth FROM a`,
      [parentUuid, limit],
    );

    return {
      childHeight: Number(below?.height ?? 0),
      childReachesParent: below?.reaches === true,
      parentDepth: Number(above?.depth ?? 0),
    };
  }

  /**
   * @description Stamps the parent's `updated_at`; edges have no timestamp of their own to bump.
   */
  private async touch(manager: EntityManager, uuid: string): Promise<void> {
    await manager.query(
      `UPDATE fragments SET updated_at = now() WHERE uuid = $1`,
      [uuid],
    );
  }
}
