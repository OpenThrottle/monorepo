/**
 * @description Byte-budget gate for the text OpenThrottle injects into model
 * sessions (OT plan cb4359d4): the openthrottle-mcp instructions block and
 * `tools/list` entries, every `skills/<slug>/SKILL.md` (body and frontmatter
 * description), and `.agents/prompts/*.md`.
 *
 * Two checks, two ways out:
 *
 *   - **Growth against the snapshot.** Any item that grew, or is new, fails
 *     until `model-facing-text.snapshot.json` is regenerated with `--write`
 *     and committed. The snapshot diff is the review: whoever approves the PR
 *     sees exactly which surface got bigger and by how much. Shrinking passes,
 *     with a note to ratchet the snapshot down.
 *   - **Caps in `model-facing-text.budget.json`.** Crossing one fails even with
 *     a fresh snapshot. Raise the cap in that file (a reviewed change) or, as a
 *     maintainer escape hatch, apply the `model-facing-text-override` PR label,
 *     which CI passes in as MODEL_FACING_TEXT_OVERRIDE=true.
 *
 * Budget policy (OT plan d7266de7):
 *
 *   - **The MCP cap is on the default toolset**, the tools a client gets with no
 *     configuration. `totals.mcpTools` and `totals.alwaysInjected` count only
 *     those. The full surface and each toolset's bytes are reported, not capped
 *     as totals. Every tool still has its per-item caps and snapshot review,
 *     whichever toolset it is in.
 *   - **Worst-case client.** The budget assumes a client injects every schema it
 *     loads at session start, as Cursor does. Clients that load schemas on
 *     demand (Claude Code tool search) cost less, and the budget does not count
 *     on that.
 *   - **Headroom.** A total cap is set to measured × 1.2, rounded up to 1 KiB,
 *     whenever it is calibrated. `--suggest-caps` prints those numbers.
 *   - **When a change would cross a cap,** in order: trim the text; move an MCP
 *     tool out of the default toolset if default workflows don't need it;
 *     recalibrate the cap in a reviewed budget change. The override label is
 *     for emergencies.
 *   - **Per-item overrides.** `perItemOverrides` raises one item's cap above its
 *     class cap (e.g. `skill/ot-loop`), for an item whose own × 1.2 headroom
 *     does not fit under its class cap. Each needs a non-empty `reason`. An
 *     override the item no longer needs is reported, so it can be removed.
 *
 * The MCP numbers come from the JSON the `@openthrottle/openthrottle-mcp:
 * measure-tool-surface` target writes (this target depends on it), so this
 * script never imports that package's source across the package boundary.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseYamlFrontmatter } from '@openthrottle/openthrottle-skills';

import { createLogger, flagValue, hasFlag } from './utils/index.ts';

const logger = createLogger();

export const BUDGET_PATH = 'scripts/model-facing-text.budget.json';
export const SNAPSHOT_PATH = 'scripts/model-facing-text.snapshot.json';
export const DEFAULT_TOOL_SURFACE_PATH = 'tmp/model-facing-text/tool-surface.json'; // prettier-ignore
export const OVERRIDE_ENV = 'MODEL_FACING_TEXT_OVERRIDE';
export const OVERRIDE_LABEL = 'model-facing-text-override';

/** Item-key prefix → the `perItem` cap that bounds it. */
export const ITEM_KINDS = [
  { cap: 'mcpToolDescription', prefix: 'mcp.toolDescription/' },
  { cap: 'mcpToolEntry', prefix: 'mcp.tool/' },
  { cap: 'promptFile', prefix: 'prompt/' },
  { cap: 'skillBody', prefix: 'skill/' },
  { cap: 'skillDescription', prefix: 'skillDescription/' },
] as const;

export const TOTAL_KEYS = [
  'alwaysInjected',
  'mcpInstructions',
  'mcpTools',
  'prompts',
  'skills',
] as const;

type ItemCap = (typeof ITEM_KINDS)[number]['cap'];
type TotalKey = (typeof TOTAL_KEYS)[number];

export interface PerItemOverride {
  readonly cap: number;
  readonly reason: string;
}

export interface Budget {
  readonly perItem: Readonly<Record<ItemCap, number>>;
  readonly perItemOverrides: Readonly<Record<string, PerItemOverride>>;
  readonly totals: Readonly<Record<TotalKey, number>>;
}

export interface ToolSurface {
  /** The tools a client gets with no toolset configuration. */
  readonly defaultToolNames: readonly string[];
  /** The instructions block a default-configured server sends. */
  readonly instructionsBytes: number;
  /** The full surface: every tool in every toolset. */
  readonly tools: readonly {
    readonly descriptionBytes: number;
    readonly name: string;
    readonly toolset: string;
    readonly totalBytes: number;
  }[];
}

export interface Measurement {
  readonly items: Readonly<Record<string, number>>;
  /** Reported, never capped: the full MCP surface and each toolset's bytes. */
  readonly reported: Readonly<Record<string, number>>;
  readonly totals: Readonly<Record<TotalKey, number>>;
}

/** Multiplier applied to a measured total when its cap is (re)calibrated. */
export const CAP_HEADROOM = 1.2;

export interface SnapshotChange {
  readonly after: number | undefined;
  readonly before: number | undefined;
  readonly key: string;
}

export interface SnapshotDiff {
  readonly grew: readonly SnapshotChange[];
  readonly shrank: readonly SnapshotChange[];
}

export interface CapBreach {
  readonly bytes: number;
  readonly cap: number;
  readonly key: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const byteLength = (text: string): number => {
  return Buffer.byteLength(text, 'utf8');
};

const sum = (values: readonly number[]): number => {
  return values.reduce((total, value) => total + value, 0);
};

const readJson = (path: string): unknown => {
  return JSON.parse(readFileSync(path, 'utf8'));
};

const numberAt = (record: Record<string, unknown>, key: string, where: string): number => {
  const value = record[key];
  if (typeof value !== 'number') {
    throw new Error(`${where}: expected a number at "${key}"`);
  }

  return value;
}; // prettier-ignore

const recordAt = (value: unknown, key: string, where: string): Record<string, unknown> => {
  const child = isRecord(value) ? value[key] : undefined;
  if (!isRecord(child)) {
    throw new Error(`${where}: expected an object at "${key}"`);
  }

  return child;
}; // prettier-ignore

/** The class cap that bounds an item key, or undefined for an uncapped key. */
export const classCapFor = (key: string, perItem: Readonly<Record<ItemCap, number>>): number | undefined => {
  const kind = ITEM_KINDS.find((candidate) => key.startsWith(candidate.prefix));

  return kind === undefined ? undefined : perItem[kind.cap];
}; // prettier-ignore

/** Parse `perItemOverrides`: each must name a capped item, carry a reason, and exceed its class cap. */
const parseOverrides = (raw: unknown, perItem: Readonly<Record<ItemCap, number>>, where: string): Record<string, PerItemOverride> => {
  const overrides = isRecord(raw) ? raw.perItemOverrides : undefined;
  if (overrides === undefined) {
    return {};
  }
  if (!isRecord(overrides)) {
    throw new Error(`${where}: expected an object at "perItemOverrides"`);
  }

  return Object.fromEntries(
    Object.keys(overrides).map((key) => {
      const entry = recordAt(overrides, key, `${where} perItemOverrides`);
      const cap = numberAt(entry, 'cap', `${where} perItemOverrides.${key}`);
      const reason = typeof entry.reason === 'string' ? entry.reason.trim() : '';
      const classCap = classCapFor(key, perItem);
      if (reason === '') {
        throw new Error(`${where}: perItemOverrides.${key} needs a non-empty "reason"`);
      }
      if (classCap === undefined) {
        throw new Error(`${where}: perItemOverrides.${key} names no capped item kind`);
      }
      if (cap <= classCap) {
        throw new Error(`${where}: perItemOverrides.${key} cap ${cap} must exceed its class cap ${classCap}`);
      }

      return [key, { cap, reason }];
    }),
  );
}; // prettier-ignore

/** Parse the budget file, failing loudly on any missing cap or malformed override. */
export const parseBudget = (raw: unknown, where: string = BUDGET_PATH): Budget => {
  const perItemRaw = recordAt(raw, 'perItem', where);
  const totals = recordAt(raw, 'totals', where);
  const perItem = {
    mcpToolDescription: numberAt(perItemRaw, 'mcpToolDescription', where),
    mcpToolEntry: numberAt(perItemRaw, 'mcpToolEntry', where),
    promptFile: numberAt(perItemRaw, 'promptFile', where),
    skillBody: numberAt(perItemRaw, 'skillBody', where),
    skillDescription: numberAt(perItemRaw, 'skillDescription', where),
  };

  return {
    perItem,
    perItemOverrides: parseOverrides(raw, perItem, where),
    totals: {
      alwaysInjected: numberAt(totals, 'alwaysInjected', where),
      mcpInstructions: numberAt(totals, 'mcpInstructions', where),
      mcpTools: numberAt(totals, 'mcpTools', where),
      prompts: numberAt(totals, 'prompts', where),
      skills: numberAt(totals, 'skills', where),
    },
  };
}; // prettier-ignore

const isStringArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
};

/** Parse the JSON written by `measure-tool-surface`. */
export const parseToolSurface = (raw: unknown, where: string): ToolSurface => {
  if (!isRecord(raw) || !Array.isArray(raw.tools) || !isStringArray(raw.defaultToolNames)) {
    throw new Error(`${where}: expected { defaultToolNames[], instructionsBytes, tools[] }`);
  } // prettier-ignore

  const tools = raw.tools.map((tool: unknown) => {
    if (!isRecord(tool) || typeof tool.name !== 'string' || typeof tool.toolset !== 'string') {
      throw new Error(`${where}: every tool needs a string "name" and "toolset"`);
    } // prettier-ignore

    return {
      descriptionBytes: numberAt(tool, 'descriptionBytes', where),
      name: tool.name,
      toolset: tool.toolset,
      totalBytes: numberAt(tool, 'totalBytes', where),
    };
  });

  return {
    defaultToolNames: raw.defaultToolNames,
    instructionsBytes: numberAt(raw, 'instructionsBytes', where),
    tools,
  };
};

/** Parse the snapshot file: a flat `{ items: { key: bytes } }` map. */
export const parseSnapshot = (raw: unknown, where: string = SNAPSHOT_PATH): Readonly<Record<string, number>> => {
  const items = recordAt(raw, 'items', where);

  return Object.fromEntries(
    Object.keys(items).map((key) => [key, numberAt(items, key, where)]),
  );
}; // prettier-ignore

const listFiles = (directory: string, predicate: (name: string) => boolean): string[] => { return existsSync(directory) ? readdirSync(directory).filter(predicate).sort() : []; }; // prettier-ignore

/** Measure every surface into one flat, key-sorted item map plus totals. */
export const measure = (cwd: string, surface: ToolSurface): Measurement => {
  const items: Record<string, number> = {
    'mcp.instructions': surface.instructionsBytes,
  };

  for (const tool of surface.tools) {
    items[`mcp.tool/${tool.name}`] = tool.totalBytes;
    items[`mcp.toolDescription/${tool.name}`] = tool.descriptionBytes;
  }

  const skillsRoot = join(cwd, 'skills');
  const slugs = listFiles(skillsRoot, (name) => existsSync(join(skillsRoot, name, 'SKILL.md'))); // prettier-ignore
  const skillBytes: number[] = [];
  const descriptionBytes: number[] = [];
  for (const slug of slugs) {
    const content = readFileSync(join(skillsRoot, slug, 'SKILL.md'), 'utf8');
    const description = parseYamlFrontmatter(content).fields.description;
    const body = byteLength(content);
    const summary = byteLength(typeof description === 'string' ? description : ''); // prettier-ignore
    items[`skill/${slug}`] = body;
    items[`skillDescription/${slug}`] = summary;
    skillBytes.push(body);
    descriptionBytes.push(summary);
  }

  const promptsRoot = join(cwd, '.agents', 'prompts');
  const promptBytes = listFiles(promptsRoot, (name) => name.endsWith('.md')).map((name) => {
    const bytes = byteLength(readFileSync(join(promptsRoot, name), 'utf8'));
    items[`prompt/${name}`] = bytes;

    return bytes;
  }); // prettier-ignore

  const defaultNames = new Set(surface.defaultToolNames);
  const mcpTools = sum(surface.tools.filter((tool) => defaultNames.has(tool.name)).map((tool) => tool.totalBytes)); // prettier-ignore
  const reported: Record<string, number> = {
    mcpToolsFull: sum(surface.tools.map((tool) => tool.totalBytes)),
  };
  for (const tool of surface.tools) {
    const key = `mcpToolset/${tool.toolset}`;
    reported[key] = (reported[key] ?? 0) + tool.totalBytes;
  }

  return {
    items: Object.fromEntries(Object.entries(items).sort(([a], [b]) => a.localeCompare(b))), // prettier-ignore
    reported: Object.fromEntries(Object.entries(reported).sort(([a], [b]) => a.localeCompare(b))), // prettier-ignore
    totals: {
      alwaysInjected: surface.instructionsBytes + mcpTools + sum(descriptionBytes), // prettier-ignore
      mcpInstructions: surface.instructionsBytes,
      mcpTools,
      prompts: sum(promptBytes),
      skills: sum(skillBytes),
    },
  };
};

/** Items that grew (or are new) and items that shrank (or are gone). */
export const diffSnapshot = (before: Readonly<Record<string, number>>, after: Readonly<Record<string, number>>): SnapshotDiff => {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort(); // prettier-ignore
  const changes = keys
    .map((key) => ({ after: after[key], before: before[key], key }))
    .filter((change) => change.after !== change.before);

  return {
    grew: changes.filter((c) => (c.after ?? 0) > (c.before ?? 0) || c.before === undefined), // prettier-ignore
    shrank: changes.filter((c) => (c.after ?? 0) < (c.before ?? 0) || c.after === undefined), // prettier-ignore
  };
}; // prettier-ignore

/** Every per-item and total cap the measurement crosses. A per-item override replaces its class cap. */
export const findCapBreaches = (measurement: Measurement, budget: Budget): CapBreach[] => {
  const breaches: CapBreach[] = [];

  for (const [key, bytes] of Object.entries(measurement.items)) {
    const cap = budget.perItemOverrides[key]?.cap ?? classCapFor(key, budget.perItem);
    if (cap !== undefined && bytes > cap) {
      breaches.push({ bytes, cap, key });
    }
  }

  for (const key of TOTAL_KEYS) {
    const bytes = measurement.totals[key];
    if (bytes > budget.totals[key]) {
      breaches.push({ bytes, cap: budget.totals[key], key: `total/${key}` });
    }
  }

  return breaches;
}; // prettier-ignore

/** The cap the headroom policy gives a measured size: × {@link CAP_HEADROOM}, rounded up to 1 KiB. */
export const calibratedCap = (bytes: number): number => {
  return Math.ceil((bytes * CAP_HEADROOM) / 1024) * 1024;
};

/**
 * Overrides the measurement no longer needs. An override exists to give one item the standard
 * headroom its class cap cannot, so it is stale once the item is gone or its own calibrated cap
 * fits under the class cap.
 */
export const findStaleOverrides = (measurement: Measurement, budget: Budget): string[] => {
  return Object.keys(budget.perItemOverrides).filter((key) => {
    const bytes = measurement.items[key];
    const classCap = classCapFor(key, budget.perItem);

    return bytes === undefined || (classCap !== undefined && calibratedCap(bytes) <= classCap);
  });
}; // prettier-ignore

const formatBytes = (bytes: number | undefined): string => {
  return bytes === undefined ? '—' : `${bytes} B`;
};

export const formatChange = (change: SnapshotChange): string => {
  const delta = (change.after ?? 0) - (change.before ?? 0);
  const sign = delta > 0 ? '+' : '';

  return `  ${change.key}: ${formatBytes(change.before)} → ${formatBytes(change.after)} (${sign}${delta} B)`; // prettier-ignore
};

export const renderSnapshot = (measurement: Measurement): string => {
  return `${JSON.stringify(
    {
      $comment: `Per-item byte baseline for ${BUDGET_PATH}. Generated — regenerate with \`pnpm nx run monorepo:check-model-facing-text -- --write\` and commit; the diff is the review of what grew.`,
      items: measurement.items,
      reported: measurement.reported,
      totals: measurement.totals,
    },
    null,
    2,
  )}\n`;
};

const isOverridden = (): boolean => {
  return ['1', 'true'].includes(
    (process.env[OVERRIDE_ENV] ?? '').toLowerCase(),
  );
};

export const main = (cwd: string = process.cwd()): number => {
  const surfacePath = join(cwd, flagValue('tool-surface') ?? DEFAULT_TOOL_SURFACE_PATH); // prettier-ignore
  if (!existsSync(surfacePath)) {
    logger.fail(`No MCP tool surface at ${surfacePath}. Run via \`pnpm nx run monorepo:check-model-facing-text\`, which measures it first.`); // prettier-ignore

    return 1;
  }

  const measurement = measure(cwd, parseToolSurface(readJson(surfacePath), surfacePath)); // prettier-ignore
  const budget = parseBudget(readJson(join(cwd, BUDGET_PATH)));
  const snapshotFile = join(cwd, SNAPSHOT_PATH);

  if (hasFlag('write')) {
    writeFileSync(snapshotFile, renderSnapshot(measurement));
    logger.success(`Wrote ${SNAPSHOT_PATH} (${Object.keys(measurement.items).length} items)`); // prettier-ignore
  }

  const before = existsSync(snapshotFile) ? parseSnapshot(readJson(snapshotFile)) : {}; // prettier-ignore
  const diff = diffSnapshot(before, measurement.items);
  const breaches = findCapBreaches(measurement, budget);
  const { totals } = measurement;

  const { reported } = measurement;
  const toolsets = Object.entries(reported).filter(([key]) => key.startsWith('mcpToolset/')).map(([key, bytes]) => `${key.slice('mcpToolset/'.length)} ${bytes} B`); // prettier-ignore

  logger.info(`Model-facing text: always-injected ${totals.alwaysInjected} B (cap ${budget.totals.alwaysInjected}), MCP tools ${totals.mcpTools} B default (cap ${budget.totals.mcpTools}), skills ${totals.skills} B, prompts ${totals.prompts} B`); // prettier-ignore
  logger.info(`MCP full surface (reported, not capped): ${reported.mcpToolsFull ?? 0} B — ${toolsets.join(', ')}`); // prettier-ignore

  if (hasFlag('suggest-caps')) {
    logger.info(`Caps at measured × ${CAP_HEADROOM}, rounded up to 1 KiB:`);
    TOTAL_KEYS.forEach((key) => logger.info(`  totals.${key}: ${calibratedCap(totals[key])} (now ${budget.totals[key]})`)); // prettier-ignore
  }

  findStaleOverrides(measurement, budget).forEach((key) => logger.info(`perItemOverrides.${key} is no longer needed — remove it from ${BUDGET_PATH}.`)); // prettier-ignore

  if (diff.shrank.length > 0) {
    logger.info(`${diff.shrank.length} item(s) shrank or were removed — rerun with --write to ratchet the snapshot down:`); // prettier-ignore
    diff.shrank.forEach((change) => logger.info(formatChange(change)));
  }

  if (diff.grew.length === 0 && breaches.length === 0) {
    logger.success('Model-facing text is within budget and no item grew.');

    return 0;
  }

  if (diff.grew.length > 0) {
    logger.fail(`${diff.grew.length} item(s) grew or are new since ${SNAPSHOT_PATH}:`); // prettier-ignore
    diff.grew.forEach((change) => logger.info(formatChange(change)));
    logger.info('If the growth is worth its per-session cost, accept it: `pnpm nx run monorepo:check-model-facing-text -- --write` and commit the snapshot.'); // prettier-ignore
  }

  if (breaches.length > 0) {
    logger.fail(`${breaches.length} cap(s) in ${BUDGET_PATH} exceeded:`);
    breaches.forEach((breach) => logger.info(`  ${breach.key}: ${breach.bytes} B > cap ${breach.cap} B (+${breach.bytes - breach.cap} B; recalibrated cap would be ${calibratedCap(breach.bytes)} B)`)); // prettier-ignore
    logger.info(`In order: trim the text; move an MCP tool out of the default toolset if default workflows don't need it; recalibrate the cap (× ${CAP_HEADROOM}) in ${BUDGET_PATH} with a reason (a perItemOverrides entry for one item). The \`${OVERRIDE_LABEL}\` PR label is for emergencies.`); // prettier-ignore
  }

  if (isOverridden()) {
    logger.warn(`${OVERRIDE_ENV} is set (\`${OVERRIDE_LABEL}\` label) — reporting only, not failing.`); // prettier-ignore

    return 0;
  }

  return 1;
};

if (process.argv[1]?.endsWith('check-model-facing-text.ts')) {
  process.exit(main());
}
