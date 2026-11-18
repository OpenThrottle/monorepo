/**
 * @description Fishery factory for {@link WorkArtifact}. Use in tests to build mock
 * artifact rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { WorkArtifact } from './work-artifact.entity.ts';
import {
  WORK_ARTIFACT_SOURCE,
  WORK_ARTIFACT_VERIFICATION,
} from './work-artifacts.constants.ts';

/**
 * @description Column-only shape for building `work_artifacts` test data.
 * @public
 */
export type WorkArtifactFactoryData = Pick<
  WorkArtifact,
  | 'createdAt'
  | 'externalKey'
  | 'id'
  | 'lifecycle'
  | 'message'
  | 'payload'
  | 'producedAt'
  | 'sessionId'
  | 'source'
  | 'type'
  | 'verification'
  | 'verifiedAt'
>;

/**
 * @description Builds WorkArtifact-shaped plain objects: an unverified git_commit claim by
 * default.
 * @public
 */
export const workArtifactsFactory = Factory.define<WorkArtifactFactoryData>(
  () => {
    const repo = `${faker.string.alphanumeric(8)}/${faker.string.alphanumeric(8)}`;
    const sha = faker.git.commitSha();

    return {
      createdAt: faker.date.recent(),
      externalKey: `github:${repo}@${sha}`,
      id: faker.string.uuid(),
      lifecycle: 'created',
      message: faker.git.commitMessage(),
      payload: { repo, sha },
      producedAt: faker.date.recent(),
      sessionId: faker.string.uuid(),
      source: WORK_ARTIFACT_SOURCE.AGENT,
      type: 'git_commit',
      verification: WORK_ARTIFACT_VERIFICATION.UNVERIFIED,
      verifiedAt: null,
    };
  },
);
