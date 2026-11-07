import { IGNORED_TRACED_PATTERNS } from '../data/data.stage.ts';
import { findNearestSlot, slotOf } from './find-nearest-slot.ts';
import { isExcludedFile } from './is-excluded-file.ts';
import {
  parseStoreDirPath,
  parseStoreFilePath,
  parseStoreOwner,
  type StorePackage,
} from './parse-store-path.ts';

/** A dependency symlink the tracer walked through, resolved to its target. */
export interface PackageLink {
  /** The link, relative to the trace base: a store or an app `node_modules/<name>`. */
  readonly from: string;
  /** Its real target folder in the pnpm store, relative to the trace base. */
  readonly to: string;
}

export interface StageCopy {
  /** Path relative to the trace base (the repo root). */
  readonly from: string;
  /** Path relative to the stage root. */
  readonly to: string;
}

export interface StagePackage {
  /** Where the package lands, relative to the stage root. */
  readonly dir: string;
  readonly name: string;
  readonly version: string;
}

export type PlanStageFilesResult =
  | {
      readonly copies: readonly StageCopy[];
      /** Traced files the allowlist refused, e.g. a `.env` or a source map. */
      readonly excluded: readonly string[];
      readonly ok: true;
      readonly packages: readonly StagePackage[];
      /** Packages only a phantom (undeclared, optional) require reached; not staged. */
      readonly skippedPhantoms: readonly string[];
    }
  | { readonly ok: false; readonly reasons: readonly string[] };

const STORE_LINK =
  /^node_modules\/\.pnpm\/[^/]+\/node_modules\/(?:@[^/]+\/)?[^/]+$/u;
const APP_LINK = /^applications\/[^/]+\/node_modules\/(?:@[^/]+\/)?[^/]+$/u;
const PHANTOM_LINK =
  /^node_modules\/\.pnpm\/node_modules\/(?:@[^/]+\/)?[^/]+$/u;
const MAX_NEST_DEPTH = 8;

/**
 * @description True for a dependency symlink the tracer reports as a "file":
 * `node_modules/.pnpm/<id>/node_modules/<dep>` or an app's own
 * `node_modules/<dep>`. The stage re-creates these relationships by placement.
 */
export const isPackageLinkPath = (path: string): boolean => {
  return (
    STORE_LINK.test(path) || APP_LINK.test(path) || PHANTOM_LINK.test(path)
  );
};

const isIgnored = (path: string): boolean => {
  return IGNORED_TRACED_PATTERNS.some((pattern) => pattern.test(path));
};

/** The closest placed copy of `name` Node would find from `dir`. */
const resolveNearest = (
  placements: ReadonlyMap<string, StorePackage>,
  dir: string,
  name: string,
): { readonly pkg: StorePackage; readonly slot: string } | undefined => {
  const slot = findNearestSlot(
    (candidate) => placements.has(candidate),
    dir,
    name,
  );
  const pkg = slot === undefined ? undefined : placements.get(slot);

  return slot === undefined || pkg === undefined ? undefined : { pkg, slot };
};

const dirDepth = (dir: string): number => {
  return dir.split('/node_modules/').length;
};

interface Graph {
  readonly edges: ReadonlyMap<string, ReadonlyMap<string, StorePackage>>;
  /**
   * Targets reached only through pnpm's virtual-store hoist
   * (`node_modules/.pnpm/node_modules/<name>`): a package requiring something
   * it never declared, in practice an optional `try { require() }`.
   */
  readonly phantoms: readonly StorePackage[];
  readonly roots: ReadonlyMap<string, StorePackage>;
}

const buildGraph = (
  links: readonly PackageLink[],
  reasons: string[],
): Graph => {
  const edges = new Map<string, Map<string, StorePackage>>();
  const roots = new Map<string, StorePackage>();
  const phantoms: StorePackage[] = [];

  for (const link of links) {
    const target = parseStoreDirPath(link.to);

    if (!target.ok) {
      reasons.push(`${link.from} -> ${target.reason}`);
      continue;
    }

    if (PHANTOM_LINK.test(link.from)) {
      phantoms.push(target.value);
      continue;
    }

    if (APP_LINK.test(link.from)) {
      const known = roots.get(target.value.name);

      if (known !== undefined && known.key !== target.value.key) {
        reasons.push(
          `the apps resolve ${target.value.name} to both ${known.version} and ${target.value.version}`,
        );
      }

      roots.set(target.value.name, target.value);
      continue;
    }

    const owner = parseStoreOwner(link.from);

    if (!owner.ok) {
      reasons.push(owner.reason);
      continue;
    }

    const own = edges.get(owner.value.key) ?? new Map<string, StorePackage>();

    own.set(target.value.name, target.value);
    edges.set(owner.value.key, own);
  }

  return { edges, phantoms, roots };
};

/** Places packages npm-style: hoist to the root, nest only on a version clash. */
const placePackages = (
  graph: Graph,
  reasons: string[],
): ReadonlyMap<string, StorePackage> => {
  const placements = new Map<string, StorePackage>();
  const queue: { dir: string; pkg: StorePackage }[] = [];
  const place = (dir: string, pkg: StorePackage): void => {
    placements.set(dir, pkg);
    queue.push({ dir, pkg });
  };

  for (const [name, pkg] of [...graph.roots].sort()) {
    place(slotOf('', name), pkg);
  }

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];

    if (item === undefined) {
      break;
    }

    const wanted = [...(graph.edges.get(item.pkg.key) ?? [])].sort();

    for (const [depName, dep] of wanted) {
      const nearest = resolveNearest(placements, item.dir, depName);

      if (nearest?.pkg.key === dep.key) {
        continue;
      }

      const slot =
        nearest === undefined ? slotOf('', depName) : slotOf(item.dir, depName);

      if (dirDepth(slot) > MAX_NEST_DEPTH) {
        reasons.push(`${slot} nests deeper than ${MAX_NEST_DEPTH} levels`);
        continue;
      }

      place(slot, dep);
    }
  }

  return placements;
};

/** After placement, every package must resolve each dependency to the right version. */
const verifyPlacements = (
  graph: Graph,
  placements: ReadonlyMap<string, StorePackage>,
  reasons: string[],
): void => {
  for (const [dir, pkg] of placements) {
    for (const [depName, dep] of graph.edges.get(pkg.key) ?? []) {
      const found = resolveNearest(placements, dir, depName);

      if (found?.pkg.key !== dep.key) {
        reasons.push(
          `${dir} would load ${found?.pkg.key ?? 'nothing'} for ${depName}, not ${dep.key}`,
        );
      }
    }
  }
};

/** Every package reachable from a phantom target through dependency links. */
const collectReachable = (graph: Graph): ReadonlySet<string> => {
  const seen = new Set<string>();
  const pending = [...graph.phantoms];

  for (let pkg = pending.pop(); pkg !== undefined; pkg = pending.pop()) {
    if (seen.has(pkg.key)) {
      continue;
    }

    seen.add(pkg.key);
    pending.push(...(graph.edges.get(pkg.key)?.values() ?? []));
  }

  return seen;
};

/**
 * @description Turns the tracer's file list and the dependency links it walked
 * into a copy plan for the stage `node_modules`. Packages are hoisted flat;
 * when two versions of one package are traced, the one most packages resolve to
 * stays at the top and the other is nested under the package that needs it.
 * The result is verified by simulating Node's resolution, and fails (never
 * guesses) on any path it cannot place.
 */
export const planStageFiles = (
  tracedPaths: readonly string[],
  links: readonly PackageLink[],
): PlanStageFilesResult => {
  const reasons: string[] = [];
  const excluded: string[] = [];
  const filesByKey = new Map<string, { from: string; rest: string }[]>();

  for (const path of tracedPaths) {
    if (isIgnored(path) || isPackageLinkPath(path)) {
      continue;
    }

    const parsed = parseStoreFilePath(path);

    if (!parsed.ok) {
      reasons.push(parsed.reason);
      continue;
    }

    if (isExcludedFile(path)) {
      excluded.push(path);
      continue;
    }

    const files = filesByKey.get(parsed.value.key) ?? [];

    files.push({ from: path, rest: parsed.value.rest });
    filesByKey.set(parsed.value.key, files);
  }

  const graph = buildGraph(links, reasons);
  const placements = placePackages(graph, reasons);

  verifyPlacements(graph, placements, reasons);

  const placedKeys = new Set([...placements.values()].map((pkg) => pkg.key));

  const phantomOnly = collectReachable(graph);
  const skippedPhantoms: string[] = [];

  for (const key of filesByKey.keys()) {
    if (placedKeys.has(key)) {
      continue;
    }

    if (phantomOnly.has(key)) {
      skippedPhantoms.push(key);
    } else {
      reasons.push(`${key} was traced but no dependency link reaches it`);
    }
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }

  const copies = new Map<string, StageCopy>();

  for (const [dir, pkg] of placements) {
    for (const file of filesByKey.get(pkg.key) ?? []) {
      const to = `${dir}/${file.rest}`;

      copies.set(to, { from: file.from, to });
    }
  }

  return {
    copies: [...copies.values()].sort((left, right) =>
      left.to.localeCompare(right.to),
    ),
    excluded,
    ok: true,
    packages: [...placements]
      .map(([dir, pkg]) => ({ dir, name: pkg.name, version: pkg.version }))
      .sort((left, right) => left.dir.localeCompare(right.dir)),
    skippedPhantoms: skippedPhantoms.sort(),
  };
};
