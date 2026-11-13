import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import {
  BaseRepository,
  PostgresProfiling,
} from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { CMS_CONNECTION } from '../../config/config.constants.ts';
import {
  CMS_FRAGMENT_TREE_MAX_DEPTH,
  CMS_FRAGMENT_TREE_MAX_NODES,
} from '../../graphql/cms-fragment-tree/cms-fragment-tree.constants.ts';
import type { CmsFragmentTreeRow } from '../../graphql/cms-fragment-tree/cms-fragment-tree.types.ts';
import { parseCmsFragmentTreeRow } from '../../graphql/cms-fragment-tree/cms-fragment-tree.utils.ts';
import { Fragment } from './fragment.entity.ts';

/**
 * @description Data access for the cms `fragments` table on the cms connection: the
 * `BaseRepository` CRUD, keyed on `uuid` and soft deleting through `is_deleted`.
 * @public
 */
@Injectable()
export class FragmentsRepository extends BaseRepository<
  Fragment,
  CreateModelInput<Fragment>
> {
  protected readonly tableName = 'fragments';

  constructor(
    @InjectRepository(Fragment, CMS_CONNECTION)
    repository: Repository<Fragment>,
  ) {
    super(repository);
  }

  /**
   * @description Every live occurrence under `rootUuid`, in one recursive query rather than one
   * per node. Each row carries its uuid path from the root; an edge back to a fragment already
   * on the path (a cycle) is not followed, and nothing deeper than
   * {@link CMS_FRAGMENT_TREE_MAX_DEPTH} is returned. Soft-deleted fragments, and everything
   * only reachable through them, are skipped. Returns `{ ok: false }` when the tree has more
   * than {@link CMS_FRAGMENT_TREE_MAX_NODES} occurrences.
   */
  @PostgresProfiling()
  async findTreeRows(
    rootUuid: string,
  ): Promise<
    | { readonly ok: false; readonly reason: 'too-large' }
    | { readonly ok: true; readonly rows: CmsFragmentTreeRow[] }
  > {
    const raw: unknown = await this.repository.query(
      `WITH RECURSIVE tree AS (
         SELECT f.uuid,
                0 AS depth,
                0 AS position,
                NULL::timestamptz AS edge_created_at,
                ARRAY[f.uuid] AS path
           FROM fragments f
          WHERE f.uuid = $1 AND f.is_deleted IS NOT TRUE
         UNION ALL
         SELECT c.children_uuid,
                t.depth + 1,
                c.sort_order::int,
                c.created_at,
                t.path || c.children_uuid
           FROM tree t
           JOIN fragments_children c ON c.fragment_uuid = t.uuid
           JOIN fragments f ON f.uuid = c.children_uuid AND f.is_deleted IS NOT TRUE
          WHERE t.depth < $2
            AND NOT c.children_uuid = ANY (t.path)
       )
       SELECT t.depth,
              t.edge_created_at,
              t.path::text[] AS path,
              t.position,
              f.is_system,
              f.name,
              f.properties,
              f.schema_uuid,
              f.typename,
              f.uuid
         FROM tree t
         JOIN fragments f ON f.uuid = t.uuid
        LIMIT $3`,
      [rootUuid, CMS_FRAGMENT_TREE_MAX_DEPTH, CMS_FRAGMENT_TREE_MAX_NODES + 1],
    );
    const list: unknown[] = Array.isArray(raw) ? raw : [];

    if (list.length > CMS_FRAGMENT_TREE_MAX_NODES) {
      return { ok: false, reason: 'too-large' };
    }

    const rows = list.flatMap((value) => {
      const row = parseCmsFragmentTreeRow(value);

      return row ? [row] : [];
    });

    return { ok: true, rows };
  }
}
