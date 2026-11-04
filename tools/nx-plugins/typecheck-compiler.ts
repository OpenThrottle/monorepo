/**
 * @description Single source of truth for WHICH TypeScript compiler binary the
 * two `typecheck` inference plugins shell out to —
 * `tools/nx-plugins/package-typecheck.ts` (buildable packages) and
 * `tools/nx-plugins/react-router-typecheck.ts` (source-first RR apps).
 *
 * Why a knob at all, rather than just editing the command when we switch?
 * Two later steps need to run the SAME target under BOTH compilers:
 * - an A/B sweep has to diff TS6's and TS7's error surface on one tree, and
 * - a partial adoption has to drop a single problem project back to TS6 without
 *   reverting the whole workspace.
 * A hardcoded binary makes both of those a working-tree edit instead of a flag.
 *
 * The workspace installs both compilers with DISJOINT bin names (see
 * `pnpm-workspace.yaml`): `typescript@7` provides only `tsc`, and
 * `@typescript/typescript6` provides only `tsc6`. That is what lets this be a
 * bare binary name rather than a path — and it is also why the default here is
 * `tsc6` and NOT `tsc`: TS7 took the `tsc` bin on install, so a bare `tsc` now
 * silently means TS7. The default must be spelled `tsc6` to keep today's
 * behaviour.
 *
 * Resolution order, highest first:
 * 1. `compilerOverrides[projectRoot]` — pins ONE project to a binary and
 *    deliberately ignores the environment, so a project parked on TS6 during a
 *    rollout cannot be dragged forward by a workspace-wide sweep.
 * 2. `$OPENTHROTTLE_TSC_BIN` — set at run time, for sweeps.
 * 3. `compiler` — the committed workspace default.
 * 4. `tsc6`.
 *
 * Rungs 2-4 are emitted as a single shell parameter expansion
 * (`${OPENTHROTTLE_TSC_BIN:-tsc6}`) rather than being resolved here, because
 * `nx:run-commands` runs the command through a shell. Resolving the env var at
 * project-graph construction instead would bake it into the cached graph, so
 * changing it would not take effect until the graph was recomputed.
 *
 * Both plugins must also spread {@link TYPECHECK_COMPILER_INPUTS} into their
 * target `inputs`, or the compiler identity is absent from the task hash and
 * Nx will happily serve one compiler's cached result for the other's run. That
 * is not hypothetical: it was reproduced here before the fix — a run with the
 * knob set to TypeScript 7, which fails, returned exit 0 with
 * "Nx read the output from the cache ... for 27 out of 27 tasks", i.e. TS6's
 * cached success.
 *
 * ## Changing the compiler: the cache-purge procedure
 *
 * With the inputs above in place a purge is belt-and-braces rather than
 * load-bearing — the hash already separates the two compilers. Run it anyway
 * when flipping the committed default, because entries cached before this fix
 * existed carry no compiler identity at all:
 *
 * 1. **Local**: `pnpm nx reset` — clears `.nx/cache` and stops the daemon.
 * 2. **Stale incremental state**: delete every `*.tsbuildinfo` outside
 *    `node_modules` (`find . -name '*.tsbuildinfo' -not -path '<star>/node_modules/<star>'
 *    -delete`, with `<star>` written literally as an asterisk — it cannot be
 *    spelled here without closing this comment). Not strictly required (see
 *    below) but it makes the first post-flip run a true cold build.
 * 3. **CI**: delete the GitHub Actions cache entries — `gh cache list` then
 *    `gh cache delete <id>`. NOTE: there is **no remote cache backend**. The
 *    paid `@nx/gcs-cache` plugin and the GCS bucket were retired on 2026-08-18
 *    (OT plan `6ced8d0e`); CI persists Nx's local `.nx/cache` through the free
 *    Actions cache. Any instruction to purge with `gcloud storage rm` is stale.
 *
 * ## Cross-compiler `.tsbuildinfo` — tested, not assumed
 *
 * `tsc --build` trusts the buildinfo to decide whether to re-emit, and this
 * workspace has a recorded trap where stale buildinfo causes a silent no-emit
 * and stale `.d.ts` reach dependents. Verified empirically that the trap does
 * NOT extend across compilers: TypeScript stamps its own version into the
 * buildinfo (`"version": "6.0.3"` vs `"7.0.2"`) and treats a mismatch as a
 * full rebuild. With a TS6 buildinfo in place, a new export added to the source
 * and TS7 invoked over it, TS7 rewrote the buildinfo and **did** emit the new
 * declaration. A cross-compiler buildinfo is therefore safe; a same-compiler
 * stale one is still the hazard the outputs list guards.
 */

/**
 * @description Environment variable that selects the compiler binary at run
 * time for every non-pinned project.
 * @public
 */
export const TYPECHECK_COMPILER_ENV_VAR = 'OPENTHROTTLE_TSC_BIN';

/**
 * @description The compiler used when nothing overrides it. `tsc6` is the
 * TypeScript 6 line; a bare `tsc` is TypeScript 7.
 * @public
 */
export const DEFAULT_TYPECHECK_COMPILER = 'tsc6';

/**
 * @description The `inputs` entries that put the COMPILER IDENTITY into the
 * task hash. Both typecheck plugins must spread this into their `inputs`.
 *
 * Two separate hazards, so two separate entries:
 * - `env` catches a **knob flip**: the command string is a shell expansion, so
 *   it is byte-identical whichever compiler is selected. Without this, the hash
 *   cannot see the difference. This is the one that was actually broken.
 * - `externalDependencies` catches a **compiler upgrade**: bumping either
 *   catalog entry must invalidate every typecheck, because `dist/**\/*.d.ts`
 *   and the `.tsbuildinfo` beside it are cached OUTPUTS. Both packages are
 *   named because either can produce the declarations that get cached.
 *
 * `typescript` is the TS6 line and `typescript7` is TS7 — the alias names from
 * `pnpm-workspace.yaml`, not the published package names.
 * @public
 */
export const TYPECHECK_COMPILER_INPUTS = [
  { env: TYPECHECK_COMPILER_ENV_VAR },
  { externalDependencies: ['typescript', 'typescript7'] },
];

/**
 * @description Options accepted by both typecheck inference plugins, set on the
 * plugin entry in `nx.json`.
 * @public
 */
export interface TypecheckCompilerOptions {
  /** Workspace default compiler binary. Defaults to {@link DEFAULT_TYPECHECK_COMPILER}. */
  readonly compiler?: string;
  /** Per-project pins, keyed by project root. A pinned project ignores the environment. */
  readonly compilerOverrides?: Readonly<Record<string, string>>;
}

/**
 * @description Returns the shell token the plugins should substitute wherever
 * they previously wrote a bare `tsc`. For a pinned project this is a literal
 * binary name; otherwise it is a shell parameter expansion that lets
 * `$OPENTHROTTLE_TSC_BIN` win at run time.
 * @public
 */
export function resolveTypecheckCompiler(
  projectRoot: string,
  options: TypecheckCompilerOptions | undefined,
): string {
  const pinned = options?.compilerOverrides?.[projectRoot];

  if (pinned !== undefined) {
    return pinned;
  }

  const fallback = options?.compiler ?? DEFAULT_TYPECHECK_COMPILER;

  return `\${${TYPECHECK_COMPILER_ENV_VAR}:-${fallback}}`;
}
