/**
 * @description Fails when CI's `gates` job runs a check that the root
 * `check:local` chain does not, so a gate added to CI cannot silently skip
 * local parity.
 *
 * `check:local` passed twice on PR #869 and CI's `gates` job still failed,
 * because CI ran the whole `audit:*:strict` glob and `check:local` named only
 * three of its audits (OT plan cfecf37f). This compares the two by what they
 * finally execute rather than by script name, since the same check is
 * spelled differently on each side (`pnpm run validate:licenses` locally,
 * `nx run monorepo:validate-licenses` in CI).
 *
 * Both sides are expanded to leaf signatures:
 *   - `pnpm run <script>` (and `pnpm <script>`, and the `pnpm run "/regex/"`
 *     glob form) expands into the script bodies in the root package.json;
 *   - `nx run monorepo:<target>[:<configuration>]` expands into the target's
 *     command, read from the root package.json `nx.targets` over nx.json
 *     `targetDefaults`;
 *   - the leaves are `tsx scripts/<file>`, `bash <file>`, `nx run-many
 *     --target=…[ --configuration=…]` (projects ignored: the local side may
 *     run a superset) and `nx run <other project>:<target>`.
 *
 * A script or target whose body yields no recognised leaf is a leaf itself,
 * named for how it was invoked. Shell glue (`echo`, `gh`, `xargs prettier`)
 * is not a check and is ignored. Comment lines in the workflow are skipped.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from './utils/logger.ts';

const logger = createLogger();

export const CI_WORKFLOW_PATH = '.github/workflows/continuous-integration.yml';

export const GATES_JOB = 'gates';

export const LOCAL_ENTRY_SCRIPT = 'check:local';

/** The Nx project whose targets are expanded into their commands. */
const ROOT_PROJECT = 'monorepo';

/** A CI gate that deliberately has no local twin, and why. */
export interface ParityExemption {
  readonly reason: string;
  readonly signature: string;
}

export const EXEMPTIONS: readonly ParityExemption[] = [
  {
    reason: `Diffs schema.gql against the PR base and reads the PR title (BASE_REF, PR_TITLE); locally there is no PR to read them from.`,
    signature: 'tsx scripts/check-graphql-breaking-changes.ts',
  },
];

/** A root-project Nx target's command and its per-configuration commands. */
export interface TargetCommands {
  readonly command: string | undefined;
  readonly configurations: Readonly<Record<string, string>>;
}

/** What a command expands through. */
export interface CommandSources {
  readonly scripts: Readonly<Record<string, string>>;
  readonly targets: Readonly<Record<string, TargetCommands>>;
}

export interface ParityReport {
  /** CI leaves no local leaf matches and no exemption covers. */
  readonly missing: readonly string[];
  /** Exemptions whose signature CI no longer runs. */
  readonly staleExemptions: readonly string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const stringOrUndefined = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

/**
 * @description The `jobs.<job>` block of a workflow, comment lines dropped.
 * Line-based on purpose: the jobs sit at two-space indent, and the root has no
 * YAML parser to lean on.
 */
export const extractJobText = (
  workflow: string,
  job: string,
): string | undefined => {
  const lines = workflow.split('\n');
  const start = lines.indexOf(`  ${job}:`);

  if (start === -1) {
    return undefined;
  }

  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^ {2}[\w-]+:\s*$/.test(line) || /^\S/.test(line)) {
      break;
    }

    if (!line.trimStart().startsWith('#')) {
      body.push(line);
    }
  }

  return body.join('\n');
};

/** Script names a `pnpm run <ref>` reference selects. */
const resolveScriptRef = (
  ref: string,
  scripts: Readonly<Record<string, string>>,
): string[] => {
  const glob = /^\/(.*)\/$/.exec(ref);

  if (glob?.[1] === undefined) {
    return ref in scripts ? [ref] : [];
  }

  const pattern = new RegExp(glob[1]);

  return Object.keys(scripts).filter((name) => pattern.test(name));
};

/** A root-project target's command, for `<target>` or `<target>:<config>`. */
const resolveTargetCommand = (
  spec: string,
  targets: Readonly<Record<string, TargetCommands>>,
): string | undefined => {
  const whole = targets[spec]?.command;

  if (whole !== undefined) {
    return whole;
  }

  const separator = spec.indexOf(':');

  if (separator === -1) {
    return undefined;
  }

  const target = targets[spec.slice(0, separator)];

  return target?.configurations[spec.slice(separator + 1)];
};

const formatRunMany = (args: string): string | undefined => {
  const target = /--targets?[= ]([^\s'"]+)/.exec(args)?.[1];

  if (target === undefined) {
    return undefined;
  }

  const configuration = /--configuration[= ]([^\s'"]+)/.exec(args)?.[1];
  const suffix = configuration === undefined ? '' : ` --configuration=${configuration}`; // prettier-ignore

  return `nx run-many --target=${target}${suffix}`;
};

/**
 * @description Expand `text` into `out`. A nested script or target that
 * yields no leaf becomes one itself, under `self`; `seen` breaks cycles.
 */
const expandInto = (
  text: string,
  sources: CommandSources,
  seen: Set<string>,
  out: Set<string>,
): void => {
  const expandNested = (body: string, self: string): void => {
    if (seen.has(self)) {
      return;
    }

    seen.add(self);
    const nested = new Set<string>();
    expandInto(body, sources, seen, nested);

    if (nested.size === 0) {
      out.add(self);
    }

    for (const signature of nested) {
      out.add(signature);
    }
  };

  for (const match of text.matchAll(/\bnx run-many\b([^\n&|;]*)/g)) {
    const signature = formatRunMany(match[1] ?? '');

    if (signature !== undefined) {
      out.add(signature);
    }
  }

  for (const match of text.matchAll(/\bnx run ([^\s'"&|;]+)/g)) {
    const spec = match[1] ?? '';
    const prefix = `${ROOT_PROJECT}:`;
    const command = spec.startsWith(prefix)
      ? resolveTargetCommand(spec.slice(prefix.length), sources.targets)
      : undefined;

    if (command === undefined) {
      out.add(`nx run ${spec}`);
    } else {
      expandNested(command, `nx run ${spec}`);
    }
  }

  for (const match of text.matchAll(/\btsx (?:\.\/)?(scripts\/[^\s'"&|;]+)/g)) {
    out.add(`tsx ${match[1] ?? ''}`);
  }

  for (const match of text.matchAll(/\b(?:bash|sh) (?:\.\/)?((?:scripts|skills)\/[^\s'"&|;]+)/g)) {
    out.add(`bash ${match[1] ?? ''}`);
  } // prettier-ignore

  const scriptRefs = [
    ...text.matchAll(/\bpnpm run (?:"([^"]+)"|([\w:.-]+))/g),
    ...text.matchAll(/\bpnpm (?!(?:run|exec|nx)(?:\s|$))([\w:.-]+)/g),
  ];

  for (const match of scriptRefs) {
    const ref = match[1] ?? match[2] ?? '';

    for (const name of resolveScriptRef(ref, sources.scripts)) {
      expandNested(sources.scripts[name] ?? '', `pnpm run ${name}`);
    }
  }
};

/** Every leaf signature `text` runs, expanded through `sources`. */
export const collectSignatures = (
  text: string,
  sources: CommandSources,
): Set<string> => {
  const out = new Set<string>();
  expandInto(text, sources, new Set(), out);

  return out;
};

export const compareParity = (
  ci: ReadonlySet<string>,
  local: ReadonlySet<string>,
  exemptions: readonly ParityExemption[],
): ParityReport => {
  const exempt = new Set(exemptions.map((exemption) => exemption.signature));
  const missing = [...ci]
    .filter((signature) => !local.has(signature) && !exempt.has(signature))
    .sort();
  const staleExemptions = [...exempt]
    .filter((signature) => !ci.has(signature))
    .sort();

  return { missing, staleExemptions };
};

/** `options.command`, or an `nx:run-commands` `options.commands` list joined one per line. */
const readOptionsCommand = (
  options: Record<string, unknown>,
): string | undefined => {
  const command = stringOrUndefined(options['command']);
  const commands = options['commands'];

  if (command !== undefined || !Array.isArray(commands)) {
    return command;
  }

  const lines = commands
    .map((entry: unknown) => {
      return isRecord(entry) ? stringOrUndefined(entry['command']) : stringOrUndefined(entry); // prettier-ignore
    })
    .filter((line): line is string => line !== undefined);

  return lines.length === 0 ? undefined : lines.join('\n');
};

const readTargets = (
  value: unknown,
  into: Record<string, TargetCommands>,
): void => {
  if (!isRecord(value)) {
    return;
  }

  for (const [name, raw] of Object.entries(value)) {
    if (!isRecord(raw)) {
      continue;
    }

    const options = isRecord(raw['options']) ? raw['options'] : {};
    const configurations: Record<string, string> = {};
    const rawConfigurations = isRecord(raw['configurations']) ? raw['configurations'] : {}; // prettier-ignore

    for (const [config, rawConfig] of Object.entries(rawConfigurations)) {
      const command = isRecord(rawConfig) ? stringOrUndefined(rawConfig['command']) : undefined; // prettier-ignore

      if (command !== undefined) {
        configurations[config] = command;
      }
    }

    const previous = into[name];
    into[name] = {
      command: readOptionsCommand(options) ?? previous?.command,
      configurations: { ...previous?.configurations, ...configurations },
    };
  }
};

/** Root package.json scripts, plus root targets (package.json `nx.targets` over nx.json `targetDefaults`). */
export const loadSources = (root: string): CommandSources => {
  const packageJson: unknown = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')); // prettier-ignore
  const nxJson: unknown = JSON.parse(readFileSync(join(root, 'nx.json'), 'utf8')); // prettier-ignore

  const scripts: Record<string, string> = {};
  const rawScripts = isRecord(packageJson) ? packageJson['scripts'] : undefined;

  if (isRecord(rawScripts)) {
    for (const [name, body] of Object.entries(rawScripts)) {
      if (typeof body === 'string') {
        scripts[name] = body;
      }
    }
  }

  const targets: Record<string, TargetCommands> = {};
  readTargets(isRecord(nxJson) ? nxJson['targetDefaults'] : undefined, targets);
  const rawNx = isRecord(packageJson) ? packageJson['nx'] : undefined;
  readTargets(isRecord(rawNx) ? rawNx['targets'] : undefined, targets);

  return { scripts, targets };
};

export const main = (root: string = process.cwd()): number => {
  const sources = loadSources(root);
  const workflow = readFileSync(join(root, CI_WORKFLOW_PATH), 'utf8');
  const gates = extractJobText(workflow, GATES_JOB);
  const entry = sources.scripts[LOCAL_ENTRY_SCRIPT];

  if (gates === undefined || entry === undefined) {
    logger.fail(`Could not find the \`${GATES_JOB}\` job in ${CI_WORKFLOW_PATH} or the \`${LOCAL_ENTRY_SCRIPT}\` script.`); // prettier-ignore

    return 1;
  }

  const ci = collectSignatures(gates, sources);
  const local = collectSignatures(entry, sources);
  const report = compareParity(ci, local, EXEMPTIONS);

  if (report.missing.length === 0 && report.staleExemptions.length === 0) {
    logger.success(`check:local / CI parity: all ${ci.size} \`${GATES_JOB}\` checks run locally (${EXEMPTIONS.length} exempt)`); // prettier-ignore

    return 0;
  }

  if (report.missing.length > 0) {
    logger.fail(`CI's \`${GATES_JOB}\` job runs ${report.missing.length} check(s) that \`${LOCAL_ENTRY_SCRIPT}\` does not:`); // prettier-ignore
    for (const signature of report.missing) {
      logger.info(`  ${signature}`);
    }

    logger.blank();
    logger.info(`Add a \`check:local:<name>\` script for it to the \`${LOCAL_ENTRY_SCRIPT}\` chain in package.json, or, if it cannot run locally, add it to EXEMPTIONS in scripts/check-local-ci-parity.ts with the reason.`); // prettier-ignore
  }

  if (report.staleExemptions.length > 0) {
    logger.fail('Exemptions CI no longer runs (remove them from EXEMPTIONS):');
    for (const signature of report.staleExemptions) {
      logger.info(`  ${signature}`);
    }
  }

  return 1;
};

if (process.argv[1]?.endsWith('check-local-ci-parity.ts')) {
  process.exit(main());
}
