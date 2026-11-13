/**
 * @description Validation and mapping between the GraphQL heartbeat types and
 * the {@link TelemetryHeartbeatsService} shapes. Validation failures are
 * BadRequestExceptions, matching the skill-usage ingest resolver.
 */

import { BadRequestException } from '@nestjs/common';
import {
  isTelemetryHeartbeatDeliveryLeg,
  normalizeRemoteUrl,
  TELEMETRY_HEARTBEAT_DELIVERY_LEG_LIST,
  type TelemetryHeartbeat,
  type UpsertTelemetryHeartbeatInput,
} from '@openthrottle/nestjs-repositories';

import type { RecordTelemetryHeartbeatInput } from './telemetry-heartbeat.input.ts';
import type { TelemetryHeartbeatObject } from './telemetry-heartbeat.object.ts';

const MACHINE_ID_MAX_LENGTH = 64;
const EMAIL_LIKE = /[^\s@]+@[^\s@]+/;
const ABSOLUTE_PATH_LIKE = /^(?:[/~]|[a-zA-Z]:[\\/])/;

const assertNoEmail = (
  label: string,
  value: string | null | undefined,
): void => {
  if (value !== null && value !== undefined && EMAIL_LIKE.test(value)) {
    throw new BadRequestException(`${label} must not contain an email address`);
  }
};

const assertCount = (label: string, value: number): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestException(`${label} must be a non-negative integer`);
  }
};

/** Trimmed value, or null when absent/blank. */
const toOptionalTrimmed = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';

  return trimmed === '' ? null : trimmed;
};

/**
 * @description Validates the client input and returns the service input.
 * repoIdentity is re-normalized; a value that does not survive becomes null.
 */
export const toUpsertTelemetryHeartbeatInput = (
  input: RecordTelemetryHeartbeatInput,
): UpsertTelemetryHeartbeatInput => {
  const deliveryLeg = input.deliveryLeg.trim();
  if (!isTelemetryHeartbeatDeliveryLeg(deliveryLeg)) {
    throw new BadRequestException(
      `deliveryLeg must be one of: ${TELEMETRY_HEARTBEAT_DELIVERY_LEG_LIST}`,
    );
  }

  const machineId = input.machineId.trim();
  if (machineId === '' || machineId.length > MACHINE_ID_MAX_LENGTH) {
    throw new BadRequestException(
      `machineId must be 1-${MACHINE_ID_MAX_LENGTH} characters`,
    );
  }

  const source = input.source.trim();
  if (source === '') {
    throw new BadRequestException('source is required');
  }

  const machineLabel = toOptionalTrimmed(input.machineLabel);
  const marketplacePluginVersion = toOptionalTrimmed(
    input.marketplacePluginVersion,
  );
  const pluginVersion = toOptionalTrimmed(input.pluginVersion);
  const rawRepoIdentity = toOptionalTrimmed(input.repoIdentity);

  assertNoEmail('machineId', machineId);
  assertNoEmail('machineLabel', machineLabel);
  assertNoEmail('marketplacePluginVersion', marketplacePluginVersion);
  assertNoEmail('pluginVersion', pluginVersion);
  assertNoEmail('source', source);

  if (rawRepoIdentity !== null && ABSOLUTE_PATH_LIKE.test(rawRepoIdentity)) {
    throw new BadRequestException(
      'repoIdentity must be a git remote, not a filesystem path',
    );
  }
  // A scp-style remote (git@host:org/repo) legitimately contains an '@', so the
  // email check runs on the normalized identity, not the raw value.
  const repoIdentity =
    rawRepoIdentity === null ? null : normalizeRemoteUrl(rawRepoIdentity);
  assertNoEmail('repoIdentity', repoIdentity);

  assertCount('bufferedEvents', input.bufferedEvents);
  assertCount('bufferedOutcomes', input.bufferedOutcomes);
  assertCount('bufferedTokenUsage', input.bufferedTokenUsage);
  assertCount('bufferedTrajectories', input.bufferedTrajectories);
  assertCount('deadLetterCount', input.deadLetterCount);

  const oldestBufferedAt = input.oldestBufferedAt ?? null;
  if (oldestBufferedAt !== null && Number.isNaN(oldestBufferedAt.getTime())) {
    throw new BadRequestException('oldestBufferedAt must be a valid date');
  }

  return {
    bufferedEvents: input.bufferedEvents,
    bufferedOutcomes: input.bufferedOutcomes,
    bufferedTokenUsage: input.bufferedTokenUsage,
    bufferedTrajectories: input.bufferedTrajectories,
    deadLetterCount: input.deadLetterCount,
    deliveryLeg,
    machineId,
    machineLabel,
    marketplacePluginInstalled: input.marketplacePluginInstalled ?? null,
    marketplacePluginVersion,
    oldestBufferedAt,
    pluginVersion,
    repoIdentity,
    source,
  };
};

/**
 * @description Converts a stored heartbeat row to the GraphQL object.
 */
export const toTelemetryHeartbeatObject = (
  row: TelemetryHeartbeat,
): TelemetryHeartbeatObject => {
  return {
    bufferedEvents: row.bufferedEvents,
    bufferedOutcomes: row.bufferedOutcomes,
    bufferedTokenUsage: row.bufferedTokenUsage,
    bufferedTrajectories: row.bufferedTrajectories,
    deadLetterCount: row.deadLetterCount,
    deliveryLeg: row.deliveryLeg,
    firstSeenAt: row.firstSeenAt,
    id: row.id,
    lastSeenAt: row.lastSeenAt,
    machineId: row.machineId,
    machineLabel: row.machineLabel,
    marketplacePluginInstalled: row.marketplacePluginInstalled,
    marketplacePluginVersion: row.marketplacePluginVersion,
    oldestBufferedAt: row.oldestBufferedAt,
    pluginVersion: row.pluginVersion,
    repoIdentity: row.repoIdentity,
    source: row.source,
  };
};
