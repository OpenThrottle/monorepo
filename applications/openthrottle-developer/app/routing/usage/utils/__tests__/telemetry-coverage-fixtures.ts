import type {
  GetUsageTelemetryCoverageQuery,
  UsageTelemetryCoverageMachineFragment,
} from '~/__generated__/graphql';

/** Loader clock shared by the telemetry-coverage specs. */
export const TELEMETRY_COVERAGE_NOW_ISO = `2026-11-13T12:00:00.000Z`;

/** ISO instant `hours` before {@link TELEMETRY_COVERAGE_NOW_ISO}. */
export const telemetryHoursAgo = (hours: number): string => {
  return new Date(
    new Date(TELEMETRY_COVERAGE_NOW_ISO).getTime() - hours * 60 * 60 * 1000,
  ).toISOString();
};

/** A healthy machine; override fields to build each warning scenario. */
export const buildTelemetryMachine = (
  overrides: Partial<UsageTelemetryCoverageMachineFragment> = {},
): UsageTelemetryCoverageMachineFragment => {
  return {
    buffer: {
      deadLetterCount: 0,
      oldestBufferedAt: null,
      totalBuffered: 0,
    },
    deliveryLegsSeen: [`repo`, `marketplace`],
    lastSeenAt: telemetryHoursAgo(1),
    machineId: `0123456789abcdef`,
    machineLabel: `work-laptop`,
    marketplacePluginInstalled: true,
    marketplacePluginVersion: `1.2.0`,
    pluginVersion: `1.2.0`,
    repos: [
      {
        deliveryLegs: [
          { deliveryLeg: `repo`, lastSeenAt: telemetryHoursAgo(2) },
          { deliveryLeg: `marketplace`, lastSeenAt: telemetryHoursAgo(26) },
        ],
        repoIdentity: `https://github.com/OpenThrottle/monorepo.git`,
      },
      { deliveryLegs: [], repoIdentity: null },
    ],
    warnings: [],
    ...overrides,
  };
};

export const buildTelemetryCoverage = (
  machines: readonly UsageTelemetryCoverageMachineFragment[],
): GetUsageTelemetryCoverageQuery['telemetryCoverage'] => {
  return {
    currentPluginVersion: `1.3.0`,
    generatedAt: TELEMETRY_COVERAGE_NOW_ISO,
    machines: [...machines],
    windowDays: 14,
  };
};
