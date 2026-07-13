/**
 * @description Fishery factories for the work-ledger entities. Use in tests to build mock rows.
 */

import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import {
  WORK_ARTIFACT_SOURCE,
  WORK_ARTIFACT_VERIFICATION,
  WORK_SESSION_CLOSED_BY,
} from './work-ledger.constants';
import type { WorkArtifactData } from './work-artifact.entity';
import type { WorkSessionSubjectData } from './work-session-subject.entity';
import type { WorkSessionData } from './work-session.entity';

/**
 * Factory for WorkSession-shaped data. Defaults to a closed service-account session
 * (single-actor invariant satisfied); override actorUserId + null the SA for a human session.
 */
export const workSessionsFactory = Factory.define<WorkSessionData>(() => {
  const startedAt = faker.date.recent();

  return {
    actorServiceAccountId: faker.string.uuid(),
    actorUserId: null,
    closedBy: WORK_SESSION_CLOSED_BY.EXPLICIT,
    conversationId: null,
    createdAt: startedAt,
    endedAt: faker.date.soon({ refDate: startedAt }),
    externalRef: faker.string.alphanumeric(12),
    id: faker.string.uuid(),
    model: 'claude-fable-5',
    onBehalfOfUserId: null,
    onBehalfOfVerified: false,
    planRunId: null,
    startedAt,
    summary: null,
    toolName: 'workflow-ralph',
    toolVersion: null,
  };
});

/** Factory for WorkSessionSubject-shaped data (plan-level by default; set taskId for task-level). */
export const workSessionSubjectsFactory =
  Factory.define<WorkSessionSubjectData>(() => ({
    attachedAt: faker.date.recent(),
    id: faker.string.uuid(),
    planId: faker.string.uuid(),
    sessionId: faker.string.uuid(),
    taskId: null,
  }));

/** Factory for WorkArtifact-shaped data (an unverified git_commit claim by default). */
export const workArtifactsFactory = Factory.define<WorkArtifactData>(() => {
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
});
