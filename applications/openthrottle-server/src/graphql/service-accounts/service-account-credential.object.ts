/**
 * @description GraphQL ObjectType for ServiceAccountCredential (never exposes secret hash).
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { ServiceAccountCredentialData } from '@openthrottle/nestjs-repositories-server';

/** Public credential fields (excludes secretHash). */
type PublicServiceAccountCredentialData = Omit<
  ServiceAccountCredentialData,
  'secretHash'
>;

@ObjectType()
export class ServiceAccountCredentialObject implements PublicServiceAccountCredentialData {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, { nullable: true })
  expiresAt!: Date | null;

  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  label!: string | null;

  @Field(() => Date, { nullable: true })
  lastUsedAt!: Date | null;

  @Field(() => String, {
    description: `Lookup prefix embedded in ot_sa_<prefix>_<secret> tokens.`,
  })
  prefix!: string;

  @Field(() => Date, { nullable: true })
  revokedAt!: Date | null;

  @Field(() => [String], {
    description: `Scope allow-list (e.g. telemetry:ingest). Null means unrestricted: the credential reaches whatever its service account can.`,
    nullable: true,
  })
  scopes!: string[] | null;

  @Field(() => ID)
  serviceAccountId!: string;
}
