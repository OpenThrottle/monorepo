/**
 * @description Static copy for the Usage-route telemetry-coverage section.
 * Component files stay presentational; labels, commands and messages live here
 * (nearest `data/` folder). Parameterized strings are function properties, the
 * same shape `data.capture-health-copy.ts` uses.
 */

/** Warning kinds the server emits on a machine (see `telemetryCoverage`). */
export const TELEMETRY_WARNING_KINDS = {
  BUFFER_GROWING: `BUFFER_GROWING`,
  BUFFER_STALE: `BUFFER_STALE`,
  DEAD_LETTERED: `DEAD_LETTERED`,
  MACHINE_SILENT: `MACHINE_SILENT`,
  MANUAL_SESSIONS_UNCOVERED: `MANUAL_SESSIONS_UNCOVERED`,
  PLUGIN_OUTDATED: `PLUGIN_OUTDATED`,
} as const;

/** Delivery legs a heartbeat can arrive through, in display order. */
export const TELEMETRY_DELIVERY_LEGS = [
  `repo`,
  `plugin-dir`,
  `marketplace`,
] as const;

/** Display labels for the server's delivery-leg ids. */
export const TELEMETRY_DELIVERY_LEG_LABELS: Readonly<Record<string, string>> = {
  marketplace: `Plugin`,
  'plugin-dir': `OT runs`,
  repo: `Repo hooks`,
};

/** Commands the section offers to copy. */
export const TELEMETRY_COVERAGE_COMMANDS = {
  doctor: `pnpm run telemetry:doctor`,
  drain: `node <ot-checkout>/.claude/hooks/skill-usage-drain.cjs`,
  drainReplayDeadLetter: `node <ot-checkout>/.claude/hooks/skill-usage-drain.cjs --replay-dead-letter`,
  envGraphqlUrl: `OPENTHROTTLE_GRAPHQL_URL=…`,
  envMcpAuthToken: `OPENTHROTTLE_MCP_AUTH_TOKEN=…`,
  pluginInstall: `claude plugin install openthrottle@openthrottle`,
  pluginMarketplaceAdd: `claude plugin marketplace add OpenThrottle/monorepo`,
  pluginUpdate: `claude plugin update openthrottle@openthrottle`,
} as const;

/** The `intent` field the row's "Forget machine" action posts to the /usage action. */
export const FORGET_TELEMETRY_MACHINE_INTENT = 'forgetTelemetryMachine';

export const TELEMETRY_COVERAGE_COPY = {
  bufferDeadLetter: (count: number): string => `${count} dead-lettered`,
  bufferEmpty: `Empty`,
  bufferOldest: (total: number, relativeLabel: string): string =>
    `${total} buffered, oldest ${relativeLabel}`,
  bufferTotal: (total: number): string => `${total} buffered`,
  columnBuffer: `Buffer`,
  columnDelivery: `Delivery`,
  columnLastSeen: `Last seen`,
  columnMachine: `Machine`,
  columnPlugin: `Plugin`,
  columnRepos: `Repos`,
  columnStatus: `Status`,
  copyLabel: `Copy`,
  detailsAriaLabel: (machineName: string): string =>
    `Repos and actions for ${machineName}`,
  detailsHeading: `Repos`,
  detailsNoRemote: `No git remote`,
  detailsNoRepos: `No repos reported`,
  detailsRepo: (repoName: string, legSummary: string): string =>
    `${repoName}: ${legSummary}`,
  detailsRepoLeg: (legLabel: string, relativeLabel: string): string =>
    `${legLabel} ${relativeLabel}`,
  doctorPrefix: `Run`,
  doctorSuffix: `on that machine for a full diagnosis.`,
  emptyCommandsLabel: `Install the plugin (run in a shell, then restart Claude Code)`,
  emptyDescription: `No machine has sent a heartbeat yet, so there is nothing to compare against. Install the plugin on each machine you start sessions from, and make sure the endpoint is set in ~/.openthrottle/.env.`,
  emptyDoctorLabel: `Check a machine`,
  emptyEnvLabel: `Endpoint lines for ~/.openthrottle/.env`,
  emptyTitle: `No machines are reporting`,
  forgetCancel: `Cancel`,
  forgetConfirm: `Forget machine`,
  forgetDescription: (machineName: string): string =>
    `Removes every heartbeat ${machineName} has reported, so it stops showing here and stops raising warnings. Use it for a machine you no longer use. Nothing on the machine changes; if it sends another heartbeat, it comes back.`,
  forgetLabel: `Forget machine`,
  forgetTitle: (machineName: string): string => `Forget ${machineName}?`,
  heading: `Telemetry coverage`,
  intro: (windowDays: number): string =>
    `Which machines and repos are reporting telemetry to this server, and whether sessions you start by hand outside the OpenThrottle repo are recorded. Showing activity from the last ${windowDays} days.`,
  pluginInstalled: `Installed`,
  pluginNotInstalled: `Not installed`,
  pluginUnknown: `Unknown`,
  statusOk: `OK`,
  statusWarnings: (count: number): string =>
    count === 1 ? `1 warning` : `${count} warnings`,
  unavailableDescription: `The coverage query failed, so this section cannot say which machines are reporting. The rest of this page is unaffected.`,
  unavailableTitle: `Telemetry coverage is unavailable`,
  warningCommandsLabels: {
    drain: `Drain the buffer manually`,
    drainReplayDeadLetter: `Replay rejected records`,
    pluginInstall: `Install the plugin (run in a shell, then restart Claude Code)`,
    pluginUpdate: `Update the plugin (run in a shell, then restart Claude Code)`,
  },
  warningDescriptions: {
    BUFFER_GROWING: (total: number): string =>
      `${total} records are waiting to be delivered and the buffer keeps growing, so the server is not accepting what this machine sends.`,
    BUFFER_STALE: (relativeLabel: string): string =>
      `The oldest buffered record was captured ${relativeLabel} and has still not reached the server, so delivery is stuck.`,
    DEAD_LETTERED: (count: number): string =>
      `The server rejected ${count} records from this machine. They are kept in dead-letter files under ~/.openthrottle/skill-usage/ and are missing from usage until replayed. Fix the cause the doctor reports, then replay them; already-recorded token usage is not counted twice.`,
    MACHINE_SILENT: (relativeLabel: string): string =>
      `This machine was last seen ${relativeLabel}. If you have used it since, telemetry is not reaching the server.`,
    MANUAL_SESSIONS_UNCOVERED: `The marketplace plugin is not installed, so sessions you start by hand outside the OpenThrottle repo record nothing.`,
    PLUGIN_OUTDATED: (installed: string, current: string): string =>
      `The installed plugin is ${installed} and the server ships ${current}. Older hooks may miss newer telemetry.`,
  },
  warningTitleUnknown: (machineName: string, kind: string): string =>
    `${machineName}: ${kind}`,
  warningTitles: {
    BUFFER_GROWING: (machineName: string): string =>
      `${machineName}: buffer is growing`,
    BUFFER_STALE: (machineName: string): string =>
      `${machineName}: buffered records are stuck`,
    DEAD_LETTERED: (machineName: string): string =>
      `${machineName}: records were rejected`,
    MACHINE_SILENT: (machineName: string): string =>
      `${machineName}: no recent heartbeat`,
    MANUAL_SESSIONS_UNCOVERED: (machineName: string): string =>
      `${machineName}: manual sessions are not recorded`,
    PLUGIN_OUTDATED: (machineName: string): string =>
      `${machineName}: plugin is out of date`,
  },
} as const;
