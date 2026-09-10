/**
 * @description Parse a work artifact's `payloadJson` into a discriminated view
 * model the panel can render: a human label, optional detail, an icon key, and
 * (for `status_change`) the from → to transition.
 *
 * Payload shapes mirror the server registry
 * (`applications/openthrottle-server/src/graphql/work-ledger/artifact-type-registry.ts`).
 * The registry is **open by design** — an unregistered type, a malformed JSON
 * string, or a payload that has drifted from its schema all degrade to the
 * `unknown` view model, which renders exactly what the panel rendered before
 * this existed (`type` + `externalKey`). Nothing here throws in render.
 *
 * Never derive identity from `externalKey`: `status_change` keys carry a uuid
 * discriminator appended server-side by `resolveArtifactForWrite`.
 */

/** Icon keys the row component maps to a lucide icon; `unknown` is the fallback. */
export const ARTIFACT_ICON_KEY = {
  DEPLOYMENT: 'deployment',
  DOCUMENT: 'document',
  GIT_COMMIT: 'git_commit',
  PLAN_PROMOTION: 'plan_promotion',
  PULL_REQUEST: 'pull_request',
  STATUS_CHANGE: 'status_change',
  UNKNOWN: 'unknown',
} as const;

export type ArtifactIconKey =
  (typeof ARTIFACT_ICON_KEY)[keyof typeof ARTIFACT_ICON_KEY];

/** A status_change transition; `from` is null for an initial state. */
export interface ArtifactTransition {
  from: string | null;
  to: string;
}

export type LinkedArtifactView =
  | {
      environment: string;
      iconKey: 'deployment';
      kind: 'deployment';
      label: string;
      ref?: string;
      url?: string;
    }
  | {
      iconKey: 'document';
      kind: 'document';
      label: string;
      title?: string;
      url: string;
    }
  | {
      iconKey: 'git_commit';
      kind: 'git_commit';
      label: string;
      /** Portion of the label rendered in normal weight, before the mono token. */
      labelPrefix: string;
      /** Present only when the landed sha differs from the claimed sha. */
      landedSha?: string;
      /** The sha token; rendered monospace, since only it is machine identity. */
      monoToken: string;
      repo: string;
      sha: string;
    }
  | {
      iconKey: 'plan_promotion';
      kind: 'plan_promotion';
      label: string;
      newPlanId: string;
    }
  | {
      iconKey: 'pull_request';
      kind: 'pull_request';
      label: string;
      labelPrefix: string;
      monoToken: string;
      number: number;
      repo: string;
    }
  | {
      entity: 'plan' | 'task';
      entityId: string;
      iconKey: 'status_change';
      kind: 'status_change';
      label: string;
      transition: ArtifactTransition;
    }
  | { iconKey: 'unknown'; kind: 'unknown'; label: string };

/** Length of the abbreviated sha shown in a commit label. */
const SHORT_SHA_LENGTH = 7;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (
  source: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = source[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const readNumber = (
  source: Record<string, unknown>,
  key: string,
): number | undefined => {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
};

/** JSON.parse that yields undefined rather than throwing on malformed input. */
const parseRecord = (json: string): Record<string, unknown> | undefined => {
  try {
    const parsed: unknown = JSON.parse(json);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/** The pre-payload rendering: type plus the raw external key. */
const unknownView = (
  type: string,
  externalKey: string,
): LinkedArtifactView => ({
  iconKey: ARTIFACT_ICON_KEY.UNKNOWN,
  kind: 'unknown',
  label: `${type} ${externalKey}`.trim(),
});

const shortSha = (sha: string): string => sha.slice(0, SHORT_SHA_LENGTH);

const gitCommitView = (
  payload: Record<string, unknown>,
): LinkedArtifactView | undefined => {
  const repo = readString(payload, 'repo');
  const sha = readString(payload, 'sha');

  if (repo === undefined || sha === undefined) {
    return undefined;
  }

  const landedSha = readString(payload, 'landedSha');

  return {
    iconKey: ARTIFACT_ICON_KEY.GIT_COMMIT,
    kind: 'git_commit',
    label: `${repo}@${shortSha(sha)}`,
    labelPrefix: `${repo}@`,
    monoToken: shortSha(sha),
    // Only a *differing* landed sha is worth surfacing — that pair is the
    // claims-vs-facts story (what the agent claimed vs what actually landed).
    ...(landedSha !== undefined && landedSha !== sha ? { landedSha } : {}),
    repo,
    sha,
  };
};

const pullRequestView = (
  payload: Record<string, unknown>,
): LinkedArtifactView | undefined => {
  const repo = readString(payload, 'repo');
  const number = readNumber(payload, 'number');

  if (repo === undefined || number === undefined) {
    return undefined;
  }

  return {
    iconKey: ARTIFACT_ICON_KEY.PULL_REQUEST,
    kind: 'pull_request',
    label: `${repo}#${number}`,
    labelPrefix: repo,
    monoToken: `#${number}`,
    number,
    repo,
  };
};

const documentView = (
  payload: Record<string, unknown>,
): LinkedArtifactView | undefined => {
  const url = readString(payload, 'url');

  if (url === undefined) {
    return undefined;
  }

  const title = readString(payload, 'title');

  return {
    iconKey: ARTIFACT_ICON_KEY.DOCUMENT,
    kind: 'document',
    label: title ?? url,
    ...(title !== undefined ? { title } : {}),
    url,
  };
};

const deploymentView = (
  payload: Record<string, unknown>,
): LinkedArtifactView | undefined => {
  const environment = readString(payload, 'environment');

  if (environment === undefined) {
    return undefined;
  }

  const ref = readString(payload, 'ref');
  const url = readString(payload, 'url');

  return {
    environment,
    iconKey: ARTIFACT_ICON_KEY.DEPLOYMENT,
    kind: 'deployment',
    label: environment,
    ...(ref !== undefined ? { ref } : {}),
    ...(url !== undefined ? { url } : {}),
  };
};

const statusChangeView = (
  payload: Record<string, unknown>,
): LinkedArtifactView | undefined => {
  const entity = readString(payload, 'entity');
  const entityId = readString(payload, 'id');
  const to = readString(payload, 'to');

  if (
    (entity !== 'plan' && entity !== 'task') ||
    entityId === undefined ||
    to === undefined
  ) {
    return undefined;
  }

  // `from` is legitimately null on an initial transition — absent, not invalid.
  const from = readString(payload, 'from') ?? null;

  return {
    entity,
    entityId,
    iconKey: ARTIFACT_ICON_KEY.STATUS_CHANGE,
    kind: 'status_change',
    label: from === null ? to : `${from} → ${to}`,
    transition: { from, to },
  };
};

const planPromotionView = (
  payload: Record<string, unknown>,
): LinkedArtifactView | undefined => {
  const newPlanId = readString(payload, 'newPlanId');

  if (newPlanId === undefined) {
    return undefined;
  }

  return {
    iconKey: ARTIFACT_ICON_KEY.PLAN_PROMOTION,
    kind: 'plan_promotion',
    label: 'promoted to a new plan',
    newPlanId,
  };
};

const VIEW_BUILDERS: Readonly<
  Record<
    string,
    (payload: Record<string, unknown>) => LinkedArtifactView | undefined
  >
> = {
  deployment: deploymentView,
  document: documentView,
  git_commit: gitCommitView,
  plan_promotion: planPromotionView,
  pull_request: pullRequestView,
  status_change: statusChangeView,
};

/**
 * @description Build the view model for one artifact row. Always returns a
 * renderable view: an unrecognized type, unparsable JSON, or a payload missing
 * required fields all fall back to `type` + `externalKey`.
 * @public
 */
export const toLinkedArtifactView = (artifact: {
  externalKey: string;
  payloadJson: string;
  type: string;
}): LinkedArtifactView => {
  const build = VIEW_BUILDERS[artifact.type];

  if (build === undefined) {
    return unknownView(artifact.type, artifact.externalKey);
  }

  const payload = parseRecord(artifact.payloadJson);

  if (payload === undefined) {
    return unknownView(artifact.type, artifact.externalKey);
  }

  return build(payload) ?? unknownView(artifact.type, artifact.externalKey);
};
