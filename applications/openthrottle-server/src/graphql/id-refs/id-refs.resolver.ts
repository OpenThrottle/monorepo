/**
 * @description GraphQL resolver for id refs: the ⌘K commander's lookup from a
 * pasted id (short fragment or full UUID) to the plans and tasks it names.
 */

import { Args, Query, Resolver } from '@nestjs/graphql';

import {
  FULL_UUID_HEX_LENGTH,
  MIN_ID_REF_LENGTH,
} from './id-refs.constants.ts';
import { IdRefObject } from './id-refs.object.ts';
import { IdRefsService } from './id-refs.service.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => IdRefObject)
export class IdRefsResolver {
  constructor(private readonly idRefsService: IdRefsService) {}

  @Query(() => [IdRefObject], {
    description: `Resolve an id to the plans and tasks it names. Accepts a short fragment (the leading hex of a UUID, e.g. "f5e40886", at least ${MIN_ID_REF_LENGTH} hex chars) or a full UUID (${FULL_UUID_HEX_LENGTH} hex chars, hyphens optional; matched exactly). Input is trimmed, lowercased and hyphen-stripped; non-hex input returns []. Plans come first, then tasks.`,
  })
  resolveIdRef(
    @Args('ref', { type: () => String }) ref: string,
  ): Promise<IdRefObject[]> {
    return this.idRefsService.resolve(ref);
  }
}
