import type {
  WORK_ARTIFACT_SOURCE,
  WORK_ARTIFACT_VERIFICATION,
  WORK_SESSION_CLOSED_BY,
} from './work-ledger.constants.ts';

export type WorkSessionClosedBy =
  (typeof WORK_SESSION_CLOSED_BY)[keyof typeof WORK_SESSION_CLOSED_BY];

export type WorkArtifactVerification =
  (typeof WORK_ARTIFACT_VERIFICATION)[keyof typeof WORK_ARTIFACT_VERIFICATION];

export type WorkArtifactSource =
  (typeof WORK_ARTIFACT_SOURCE)[keyof typeof WORK_ARTIFACT_SOURCE];
