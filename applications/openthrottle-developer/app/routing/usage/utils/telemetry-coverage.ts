import type {
  UsageTelemetryCoverageMachineFragment,
  UsageTelemetryCoverageRepoFragment,
} from '~/__generated__/graphql';
import {
  TELEMETRY_COVERAGE_COPY,
  TELEMETRY_DELIVERY_LEG_LABELS,
  TELEMETRY_WARNING_KINDS,
} from '~/routing/usage/data/data.telemetry-coverage-copy';

/** Characters of the machine id shown when the machine has no label. */
const SHORT_MACHINE_ID_LENGTH = 8;

/** Order warnings are listed in: the loudest failure first. */
const WARNING_KIND_ORDER: readonly string[] = [
  TELEMETRY_WARNING_KINDS.MACHINE_SILENT,
  TELEMETRY_WARNING_KINDS.MANUAL_SESSIONS_UNCOVERED,
  TELEMETRY_WARNING_KINDS.PLUGIN_OUTDATED,
  TELEMETRY_WARNING_KINDS.BUFFER_STALE,
  TELEMETRY_WARNING_KINDS.BUFFER_GROWING,
];

/** One warning, unique per (machine, kind). */
export interface TelemetryCoverageWarningEntry {
  readonly key: string;
  readonly kind: string;
  readonly machine: UsageTelemetryCoverageMachineFragment;
  readonly message: string;
}

/** The first characters of a machine id, for a label-less machine. */
export const shortMachineId = (machineId: string): string => {
  return machineId.slice(0, SHORT_MACHINE_ID_LENGTH);
};

/** The machine's label when it has one, else its short id. */
export const machineDisplayName = (
  machine: Pick<
    UsageTelemetryCoverageMachineFragment,
    'machineId' | 'machineLabel'
  >,
): string => {
  const label = machine.machineLabel?.trim();

  if (label !== undefined && label !== '') {
    return label;
  }

  return shortMachineId(machine.machineId);
};

/**
 * `org/repo` for a git remote URL (https, ssh or scp-style, with or without a
 * `.git` suffix), or `null` for no remote. A value that is not a recognizable
 * URL is returned as-is rather than dropped.
 */
export const repoDisplayName = (
  repoIdentity: string | null | undefined,
): string | null => {
  const identity = repoIdentity?.trim();

  if (identity === undefined || identity === '') {
    return null;
  }

  const withoutSuffix = identity.replace(/\/+$/, '').replace(/\.git$/, '');
  const afterScheme = withoutSuffix.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const hostSeparator = afterScheme.search(/[/:]/);

  if (hostSeparator === -1) {
    return identity;
  }

  const path = afterScheme.slice(hostSeparator + 1).replace(/^\/+/, '');
  const segments = path.split('/').filter((segment) => segment !== '');

  if (segments.length < 2) {
    return identity;
  }

  return segments.slice(-2).join('/');
};

/** Display label for a delivery leg, falling back to the raw id. */
export const deliveryLegLabel = (leg: string): string => {
  return TELEMETRY_DELIVERY_LEG_LABELS[leg] ?? leg;
};

/** True when the machine has delivered through `leg`. */
export const hasDeliveryLeg = (
  machine: Pick<UsageTelemetryCoverageMachineFragment, 'deliveryLegsSeen'>,
  leg: string,
): boolean => {
  return machine.deliveryLegsSeen.includes(leg);
};

/**
 * @description Alert variant for a warning. Only uncovered manual sessions
 * mean data is being lost right now, so only that one is destructive; the rest
 * are degraded states that still need attention.
 */
export const telemetryWarningVariant = (
  kind: string,
): 'default' | 'destructive' => {
  if (kind === TELEMETRY_WARNING_KINDS.MANUAL_SESSIONS_UNCOVERED) {
    return 'destructive';
  }

  return 'default';
};

/** What the Plugin column shows: the version, or the install state. */
export const pluginDisplay = (
  machine: Pick<
    UsageTelemetryCoverageMachineFragment,
    'marketplacePluginInstalled' | 'marketplacePluginVersion'
  >,
): string => {
  if (machine.marketplacePluginInstalled === false) {
    return TELEMETRY_COVERAGE_COPY.pluginNotInstalled;
  }

  if (machine.marketplacePluginInstalled === null) {
    return TELEMETRY_COVERAGE_COPY.pluginUnknown;
  }

  return (
    machine.marketplacePluginVersion ?? TELEMETRY_COVERAGE_COPY.pluginInstalled
  );
};

/**
 * Every warning across `machines`, one per (machine, kind), ordered by kind
 * severity and then machine order. Unknown kinds sort last.
 */
export const groupTelemetryWarnings = (
  machines: readonly UsageTelemetryCoverageMachineFragment[],
): TelemetryCoverageWarningEntry[] => {
  const entries = machines.flatMap((machine) => {
    const seenKinds = new Set<string>();
    const unique: TelemetryCoverageWarningEntry[] = [];

    for (const warning of machine.warnings) {
      if (!seenKinds.has(warning.kind)) {
        seenKinds.add(warning.kind);
        unique.push({
          key: `${machine.machineId}:${warning.kind}`,
          kind: warning.kind,
          machine,
          message: warning.message,
        });
      }
    }

    return unique;
  });

  const rank = (kind: string): number => {
    const index = WARNING_KIND_ORDER.indexOf(kind);

    return index === -1 ? WARNING_KIND_ORDER.length : index;
  };

  return entries.toSorted((left, right) => rank(left.kind) - rank(right.kind));
};

/** Number of distinct warning kinds on one machine. */
export const countMachineWarnings = (
  machine: Pick<UsageTelemetryCoverageMachineFragment, 'warnings'>,
): number => {
  return new Set(machine.warnings.map((warning) => warning.kind)).size;
};

/** Delivery legs a repo came through, as `Leg 2h ago, Leg 1d ago`. */
export const repoLegSummary = (
  repo: Pick<UsageTelemetryCoverageRepoFragment, 'deliveryLegs'>,
  formatRelative: (iso: string) => string,
): string => {
  return repo.deliveryLegs
    .map((leg) => {
      return TELEMETRY_COVERAGE_COPY.detailsRepoLeg(
        deliveryLegLabel(leg.deliveryLeg),
        formatRelative(leg.lastSeenAt),
      );
    })
    .join(`, `);
};
