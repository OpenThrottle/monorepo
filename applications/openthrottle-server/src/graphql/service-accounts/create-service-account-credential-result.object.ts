/**
 * @description One-time result of creating a service account credential (plaintext token shown once).
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { ServiceAccountCredentialObject } from './service-account-credential.object';

@ObjectType()
export class CreateServiceAccountCredentialResultObject {
  @Field(() => ServiceAccountCredentialObject, {
    description: `Saved credential metadata (secret hash is never returned).`,
  })
  credential!: ServiceAccountCredentialObject;

  @Field(() => String, {
    description: `Plaintext ot_sa_<prefix>_<secret> token; store securely — not retrievable again.`,
  })
  token!: string;
}
