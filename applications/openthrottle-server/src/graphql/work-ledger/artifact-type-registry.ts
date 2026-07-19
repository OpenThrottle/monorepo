/**
 * @description Server-side registry of work-ledger artifact types (design §5, G10).
 * Each type declares: its dedupe identity (idempotent | event), a zod payload schema,
 * an external_key derivation rule, and its lifecycle vocabulary + which lifecycle
 * states fire downstream triggers. The type set is open by design — adding an ecosystem
 * means adding a definition here (no DB-driven type registration in v1).
 */

import { randomUUID } from 'node:crypto';
import { z } from 'zod';

/**
 * @description Dedupe identity of an artifact type.
 * - `idempotent`: re-reporting the same external_key upserts (git_commit, pull_request).
 * - `event`: every report is a distinct row; external_key carries a discriminator (status_change).
 */
export const ARTIFACT_IDENTITY = {
  EVENT: 'event',
  IDEMPOTENT: 'idempotent',
} as const;

export type ArtifactIdentity =
  (typeof ARTIFACT_IDENTITY)[keyof typeof ARTIFACT_IDENTITY];

interface ArtifactTypeDefinition {
  /**
   * Derive the canonical external_key from a validated payload. For `event` types this is
   * the transition base; recordWorkArtifact appends a uniqueness discriminator (design §3.3).
   */
  readonly deriveExternalKey: (payload: Record<string, unknown>) => string;
  /** Dedupe identity — drives upsert vs append in recordWorkArtifact. */
  readonly identity: ArtifactIdentity;
  /** Lifecycle state assigned at creation; null for types without a lifecycle. */
  readonly initialLifecycle: string | null;
  /** The full lifecycle vocabulary (for validation); empty for lifecycle-less types. */
  readonly lifecycleStates: readonly string[];
  /** Lifecycle states whose entry fires downstream triggers (e.g. git_commit 'landed'). */
  readonly triggerStates: readonly string[];
  /**
   * Validate a raw payload against this type's zod schema, returning the parsed record.
   * A per-type function (not a stored ZodType) keeps the registry cast-free despite the
   * heterogeneous schemas — zod's ZodType is invariant, so a common field type would need `as`.
   */
  readonly validatePayload: (raw: unknown) => Record<string, unknown>;
}

const gitCommitPayload = z
  .object({
    landedSha: z.string().min(1).optional(),
    repo: z.string().min(1),
    sha: z.string().min(1),
  })
  .strict();

const pullRequestPayload = z
  .object({
    number: z.number().int().positive(),
    repo: z.string().min(1),
  })
  .strict();

const documentPayload = z
  .object({
    title: z.string().min(1).optional(),
    url: z.string().min(1),
  })
  .strict();

const deploymentPayload = z
  .object({
    environment: z.string().min(1),
    ref: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
  })
  .strict();

const statusChangePayload = z
  .object({
    entity: z.enum(['plan', 'task']),
    from: z.string().min(1).nullable(),
    id: z.string().min(1),
    to: z.string().min(1),
  })
  .strict();

const planPromotionPayload = z
  .object({
    newPlanId: z.string().min(1),
    sourcePlanId: z.string().min(1),
    sourceTaskId: z.string().min(1),
  })
  .strict();

/**
 * @description The artifact type registry. Keyed by the `type` string persisted on work_artifacts.
 */
const ARTIFACT_TYPE_REGISTRY: Readonly<Record<string, ArtifactTypeDefinition>> =
  {
    deployment: {
      deriveExternalKey: (payload) =>
        `deployment:${String(payload.environment)}:${String(payload.ref ?? 'latest')}`,
      identity: ARTIFACT_IDENTITY.IDEMPOTENT,
      initialLifecycle: 'pending',
      lifecycleStates: ['failed', 'pending', 'succeeded'],
      triggerStates: [],
      validatePayload: (raw) => deploymentPayload.parse(raw),
    },
    document: {
      deriveExternalKey: (payload) => `document:${String(payload.url)}`,
      identity: ARTIFACT_IDENTITY.IDEMPOTENT,
      initialLifecycle: null,
      lifecycleStates: ['draft', 'published'],
      triggerStates: [],
      validatePayload: (raw) => documentPayload.parse(raw),
    },
    git_commit: {
      deriveExternalKey: (payload) =>
        `github:${String(payload.repo)}@${String(payload.sha)}`,
      identity: ARTIFACT_IDENTITY.IDEMPOTENT,
      initialLifecycle: 'created',
      lifecycleStates: ['created', 'landed'],
      // 'landed' fires refine-tagging in slice 6/7 (re-keying the #182 trigger off link_commit).
      triggerStates: ['landed'],
      validatePayload: (raw) => gitCommitPayload.parse(raw),
    },
    plan_promotion: {
      // One promotion per source task: re-delivery of the promotion job upserts
      // the same key rather than appending a duplicate provenance row.
      deriveExternalKey: (payload) =>
        `plan_promotion:${String(payload.sourceTaskId)}`,
      identity: ARTIFACT_IDENTITY.IDEMPOTENT,
      initialLifecycle: null,
      lifecycleStates: [],
      triggerStates: [],
      validatePayload: (raw) => planPromotionPayload.parse(raw),
    },
    pull_request: {
      deriveExternalKey: (payload) =>
        `github:${String(payload.repo)}#${String(payload.number)}`,
      identity: ARTIFACT_IDENTITY.IDEMPOTENT,
      initialLifecycle: 'open',
      lifecycleStates: ['closed', 'merged', 'open'],
      triggerStates: [],
      validatePayload: (raw) => pullRequestPayload.parse(raw),
    },
    status_change: {
      deriveExternalKey: (payload) =>
        `status_change:${String(payload.entity)}:${String(payload.id)}:${String(payload.to)}`,
      identity: ARTIFACT_IDENTITY.EVENT,
      initialLifecycle: null,
      lifecycleStates: [],
      triggerStates: [],
      validatePayload: (raw) => statusChangePayload.parse(raw),
    },
  };

/** @description True when `type` is a registered artifact type. */
export const isRegisteredArtifactType = (type: string): boolean =>
  Object.prototype.hasOwnProperty.call(ARTIFACT_TYPE_REGISTRY, type);

/** @description Registered artifact type names (for error messages / introspection). */
export const registeredArtifactTypes = (): readonly string[] =>
  Object.keys(ARTIFACT_TYPE_REGISTRY);

export interface ResolvedArtifact {
  readonly externalKey: string;
  readonly identity: ArtifactIdentity;
  readonly initialLifecycle: string | null;
  readonly payload: Record<string, unknown>;
}

/**
 * @description Validate a raw artifact payload against its type and resolve the persisted shape:
 * the parsed payload, dedupe identity, initial lifecycle, and external_key. For `event` types the
 * external_key gets a uuid discriminator appended so each report is a distinct append-only row;
 * for `idempotent` types it is the canonical key so re-reports upsert. Throws on unknown type or
 * schema violation (the resolver maps this to a GraphQL error).
 */
export const resolveArtifactForWrite = (
  type: string,
  rawPayload: unknown,
): ResolvedArtifact => {
  const definition = ARTIFACT_TYPE_REGISTRY[type];

  if (definition === undefined) {
    throw new Error(
      `Unknown work artifact type "${type}". Registered: ${registeredArtifactTypes().join(', ')}.`,
    );
  }

  const payload = definition.validatePayload(rawPayload);
  const baseKey = definition.deriveExternalKey(payload);
  const externalKey =
    definition.identity === ARTIFACT_IDENTITY.EVENT
      ? `${baseKey}:${randomUUID()}`
      : baseKey;

  return {
    externalKey,
    identity: definition.identity,
    initialLifecycle: definition.initialLifecycle,
    payload,
  };
};
