import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseVersion, satisfies } from '../check-node-engine.mjs';
import {
  buildCandidateUrls,
  checkNodeEngine,
  isUnexpandedPlaceholder,
  isUnreachableError,
  parseDockerServerPort,
  probe,
  readEnginesNodeRange,
  resolveClientWorkspacePath,
} from '../run-openthrottle-mcp.ts';

describe('isUnexpandedPlaceholder', () => {
  it('treats literal ${...} passthroughs as unset', () => {
    expect(isUnexpandedPlaceholder('${OPENTHROTTLE_MCP_AUTH_TOKEN}')).toBe(true); // prettier-ignore
    expect(isUnexpandedPlaceholder('ot_sa_prefix_secret')).toBe(false);
    expect(isUnexpandedPlaceholder(undefined)).toBe(false);
  });
});

describe('parseDockerServerPort', () => {
  it('finds the first published port of a server-named container', () => {
    const ps = [
      'openthrottle-postgres\t0.0.0.0:6010->5432/tcp',
      'openthrottle-server\t0.0.0.0:6021->6021/tcp, :::6021->6021/tcp',
    ].join('\n');

    expect(parseDockerServerPort(ps)).toBe('6021');
  });

  it('returns undefined without a server container or ports', () => {
    expect(parseDockerServerPort('redis\t0.0.0.0:6011->6379/tcp')).toBeUndefined(); // prettier-ignore
    expect(parseDockerServerPort('openthrottle-server\t')).toBeUndefined();
    expect(parseDockerServerPort('')).toBeUndefined();
  });
});

describe('buildCandidateUrls', () => {
  const inputs = {
    dockerUrl: 'http://localhost:9000',
    rootUrl: 'http://localhost:6021',
    worktreeUrl: 'http://localhost:7421',
  };

  it('is stable-first by default, worktree as liveness fallback', () => {
    expect(buildCandidateUrls(inputs)).toEqual([
      'http://localhost:6021',
      'http://localhost:9000',
      'http://localhost:7421',
    ]);
  });

  it('prefers the worktree with OT_MCP_TARGET=worktree', () => {
    expect(buildCandidateUrls({ ...inputs, target: 'worktree' })[0]).toBe(
      'http://localhost:7421',
    );
  });

  it('always ends on the canonical fallback and de-dupes', () => {
    expect(buildCandidateUrls({})).toEqual(['http://localhost:6021']);
    expect(buildCandidateUrls({ rootUrl: 'http://localhost:6021' })).toEqual([
      'http://localhost:6021',
    ]);
  });
});

describe('resolveClientWorkspacePath', () => {
  const CHECKOUT = '/Users/dev/openthrottle';
  const FOREIGN = '/Users/dev/github/acme/native-apps';

  it('reports the caller cwd, so a foreign checkout is not erased by the chdir', () => {
    expect(resolveClientWorkspacePath({ cwd: FOREIGN })).toBe(FOREIGN);
  });

  it('still reports the checkout when the caller launched from inside it', () => {
    expect(resolveClientWorkspacePath({ cwd: CHECKOUT })).toBe(CHECKOUT);
  });

  it('lets an explicit override beat the cwd, trimmed', () => {
    expect(
      resolveClientWorkspacePath({ cwd: CHECKOUT, override: `  ${FOREIGN}  ` }),
    ).toBe(FOREIGN);
  });

  it('falls back to the cwd for an empty or unexpanded override', () => {
    expect(resolveClientWorkspacePath({ cwd: FOREIGN, override: '   ' })).toBe(FOREIGN); // prettier-ignore
    expect(
      resolveClientWorkspacePath({
        cwd: FOREIGN,
        override: '${OPENTHROTTLE_MCP_WORKSPACE_PATH}',
      }),
    ).toBe(FOREIGN);
  });
});

/**
 * The unit tests above cover the resolver in isolation, but the invariant this
 * plan exists to protect is an ORDERING one — the caller's cwd must be read
 * BEFORE the launcher chdirs into the checkout — and no pure function can
 * assert that. So run the real shim from a directory that is deliberately not
 * the checkout and read back the workspace it reports. Resolve-only mode
 * narrates the workspace before it probes for a server, so this stays fast and
 * does not need one running.
 */
describe('the launcher reports the caller workspace, not the checkout it runs in', () => {
  it('survives its own chdir', () => {
    const callerCwd = realpathSync(mkdtempSync(join(tmpdir(), 'ot-mcp-cwd-')));
    const shim = join(import.meta.dirname, '..', 'run-openthrottle-mcp.sh');

    try {
      const result = spawnSync('bash', [shim], {
        cwd: callerCwd,
        encoding: 'utf8',
        env: { ...process.env, OT_MCP_RESOLVE_ONLY: '1' },
        timeout: 20_000,
      });

      expect(result.stderr).toContain(`author workspace ${callerCwd}`);
    } finally {
      rmSync(callerCwd, { force: true, recursive: true });
    }
  });
});

describe('readEnginesNodeRange', () => {
  it('reads the live root range', () => {
    const range = readEnginesNodeRange(join(import.meta.dirname, '..', '..', 'package.json')); // prettier-ignore

    expect(range).toMatch(/\d/);
  });

  it('is undefined for a missing file or a manifest without engines.node', () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'ot-mcp-engines-')));

    try {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ engines: {} }));

      expect(readEnginesNodeRange(join(dir, 'package.json'))).toBeUndefined();
      expect(readEnginesNodeRange(join(dir, 'missing.json'))).toBeUndefined();
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('checkNodeEngine', () => {
  const RANGE = '>=22.22.3 <23 || >=24.15 <25 || >=26';

  it('is satisfied by a version inside the range', () => {
    expect(checkNodeEngine('v24.18.0', RANGE)).toEqual({ kind: 'satisfied' });
  });

  it('rejects a version outside the range, naming it', () => {
    expect(checkNodeEngine('v16.17.1', RANGE)).toEqual({
      kind: 'unsupported',
      range: RANGE,
    });
  });

  it('reports an absent or unparseable range instead of passing it', () => {
    expect(checkNodeEngine('v24.18.0', undefined).kind).toBe('unreadable');
    expect(checkNodeEngine('v24.18.0', '^24').kind).toBe('unreadable');
    expect(checkNodeEngine('not-a-version', RANGE).kind).toBe('unreadable');
  });
});

describe('isUnreachableError', () => {
  it('treats the failures fetch reports for a dead or slow server as unreachable', () => {
    const network = new TypeError('fetch failed', { cause: new Error('ECONNREFUSED') }); // prettier-ignore

    expect(isUnreachableError(network)).toBe(true);
    expect(isUnreachableError(new DOMException('timed out', 'TimeoutError'))).toBe(true); // prettier-ignore
    expect(isUnreachableError(new DOMException('aborted', 'AbortError'))).toBe(true); // prettier-ignore
  });

  it('lets a broken runtime surface instead of blaming the server', () => {
    expect(isUnreachableError(new ReferenceError('fetch is not defined'))).toBe(false); // prettier-ignore
    expect(isUnreachableError(new TypeError('AbortSignal.timeout is not a function'))).toBe(false); // prettier-ignore
    expect(isUnreachableError('ECONNREFUSED')).toBe(false);
  });
});

describe('probe', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false for a server that is down', async () => {
    const server = createServer().listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0; // prettier-ignore
    await new Promise((resolve) => server.close(resolve));

    await expect(probe(`http://127.0.0.1:${port}`)).resolves.toBe(false);
  });

  it('is false for a server that never answers in time', async () => {
    const server = createServer(() => undefined).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0; // prettier-ignore

    try {
      await expect(probe(`http://127.0.0.1:${port}`, 100)).resolves.toBe(false);
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });

  it('rethrows when fetch itself is missing, as on Node 16', async () => {
    vi.stubGlobal('fetch', () => {
      throw new ReferenceError('fetch is not defined');
    });

    await expect(probe('http://127.0.0.1:1')).rejects.toBeInstanceOf(ReferenceError); // prettier-ignore
  });
});

/**
 * Node selection, exercised for real but hermetically: every `node` here is a
 * shell stub in a temp dir that answers `--version` and otherwise announces
 * itself on stderr, and `$NVM_DIR` points at a fake install tree. Nothing reads
 * the developer's ~/.nvm or needs an OpenThrottle server.
 */
const SCRIPTS_DIR = join(import.meta.dirname, '..');
const REPO_DIR = join(SCRIPTS_DIR, '..');
const SHIM = join(SCRIPTS_DIR, 'run-openthrottle-mcp.sh');
const RESOLVER = join(SCRIPTS_DIR, 'utils', 'resolve-node.sh');
const BASH = spawnSync('bash', ['-c', 'printf %s "$BASH"'], { encoding: 'utf8' }).stdout; // prettier-ignore
const LIVE_NVMRC = readFileSync(join(REPO_DIR, '.nvmrc'), 'utf8').trim().replace(/^v/, ''); // prettier-ignore
const LIVE_RANGE = readEnginesNodeRange(join(REPO_DIR, 'package.json')) ?? '';
const RANGE = '>=22.22.3 <23 || >=24.15 <25 || >=26';

const tempRoots: string[] = [];

const makeTempDir = (): string => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'ot-mcp-node-')));
  tempRoots.push(dir);

  return dir;
};

/** Write an executable `node` stub reporting `version` into `binDir`. */
const installStubNode = (binDir: string, version: string): string => {
  mkdirSync(binDir, { recursive: true });
  const path = join(binDir, 'node');
  writeFileSync(
    path,
    [
      '#!/bin/sh',
      `if [ "\${1:-}" = --version ]; then echo v${version}; exit 0; fi`,
      `echo "FAKE_NODE_RAN v${version}" >&2`,
      'exit 0',
      '',
    ].join('\n'),
  );
  chmodSync(path, 0o755);

  return path;
};

const installNvmNodes = (nvmDir: string, versions: readonly string[]): void => {
  for (const version of versions) {
    installStubNode(join(nvmDir, 'versions', 'node', `v${version}`, 'bin'), version); // prettier-ignore
  }
};

interface CheckoutSpec {
  readonly nvmrc: string | undefined;
  readonly range: string | undefined;
}

const makeCheckout = (spec: CheckoutSpec): string => {
  const dir = makeTempDir();
  const manifest = spec.range === undefined ? {} : { engines: { node: spec.range } }; // prettier-ignore
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`); // prettier-ignore

  if (spec.nvmrc !== undefined) {
    writeFileSync(join(dir, '.nvmrc'), spec.nvmrc);
  }

  return dir;
};

type ResolveOutcome =
  | { readonly bin: string; readonly kind: 'resolved'; readonly version: string } // prettier-ignore
  | { readonly kind: 'failed'; readonly tried: string };

interface ResolveInputs {
  readonly checkout: string;
  readonly env: Readonly<Record<string, string>>;
  readonly primary: string;
}

/** Source the resolver into a clean bash and read its globals back. */
const resolveNode = (inputs: ResolveInputs): ResolveOutcome => {
  const script = [
    'set -eu',
    '. "$0"',
    'if ot_resolve_node "$1" "$2"; then',
    '  printf "resolved\\n%s\\n%s" "$OT_NODE_VERSION" "$OT_NODE_BIN"',
    'else',
    '  printf "failed\\n%s" "$OT_NODE_TRIED"',
    'fi',
  ].join('\n');
  const result = spawnSync(BASH, ['-c', script, RESOLVER, inputs.checkout, inputs.primary], { encoding: 'utf8', env: { ...inputs.env } }); // prettier-ignore
  const [kind = '', first = '', second = ''] = result.stdout.split('\n');

  return kind === 'resolved'
    ? { bin: second, kind: 'resolved', version: first }
    : { kind: 'failed', tried: first };
};

afterEach(() => {
  for (const dir of tempRoots.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe('ot_node_satisfies agrees with check-node-engine.mjs', () => {
  it('returns the same verdict for every version and range', () => {
    const versions = ['v16.17.1', '18', '20.1.0', '22.1.0', '22.22.2', '22.22.3', '23.0.0', '24.14.9', '24.15.0', '24.9.0', 'v24.18.0-rc.1', '25.0.0', '26.0.0', 'abc']; // prettier-ignore
    const ranges = [RANGE, LIVE_RANGE, '>=18', '>18.0.0 <=20.1', '=22.1.0', '22.1.0', '22.x', '>=1.2.3 || <0.5', '  >=20  ', '||', 'garbage', '>=', '==22']; // prettier-ignore
    const pairs = versions.flatMap((version) => ranges.map((range) => ({ range, version }))); // prettier-ignore
    const script = [
      '. "$0"',
      "while IFS=$'\\t' read -r version range; do",
      '  if ot_node_satisfies "$version" "$range"; then echo 0; else echo $?; fi',
      'done',
    ].join('\n');

    const result = spawnSync(BASH, ['-c', script, RESOLVER], {
      encoding: 'utf8',
      input: pairs.map(({ range, version }) => `${version}\t${range}`).join('\n') + '\n', // prettier-ignore
    });
    const actual = result.stdout.trim().split('\n');
    const expected = pairs.map(({ range, version }) => {
      const parsed = parseVersion(version);
      const verdict = parsed === null ? null : satisfies(parsed, range);

      return verdict === null ? '2' : verdict ? '0' : '1';
    });

    expect(actual).toEqual(expected);
  });
});

describe('ot_resolve_node', () => {
  const EMPTY_PATH = '/nonexistent-ot-mcp-path';

  describe('when OT_MCP_NODE is set', () => {
    it('uses it ahead of the .nvmrc version', () => {
      const nvm = makeTempDir();
      installNvmNodes(nvm, ['24.18.0']);
      const explicit = installStubNode(join(makeTempDir(), 'bin'), '22.23.2');

      const outcome = resolveNode({
        checkout: makeCheckout({ nvmrc: '24.18.0', range: RANGE }),
        env: { NVM_DIR: nvm, OT_MCP_NODE: explicit, PATH: EMPTY_PATH },
        primary: '',
      });

      expect(outcome).toEqual({ bin: join(explicit, '..'), kind: 'resolved', version: 'v22.23.2' }); // prettier-ignore
    });

    it('fails rather than falling through when it is too old', () => {
      const nvm = makeTempDir();
      installNvmNodes(nvm, ['24.18.0']);
      const explicit = installStubNode(join(makeTempDir(), 'bin'), '16.17.1');

      const outcome = resolveNode({
        checkout: makeCheckout({ nvmrc: '24.18.0', range: RANGE }),
        env: { NVM_DIR: nvm, OT_MCP_NODE: explicit, PATH: EMPTY_PATH },
        primary: '',
      });

      expect(outcome).toEqual({ kind: 'failed', tried: `OT_MCP_NODE=${explicit} v16.17.1` }); // prettier-ignore
    });

    it('ignores an unexpanded ${...} placeholder', () => {
      const nvm = makeTempDir();
      installNvmNodes(nvm, ['24.18.0']);

      const outcome = resolveNode({
        checkout: makeCheckout({ nvmrc: '24.18.0', range: RANGE }),
        env: { NVM_DIR: nvm, OT_MCP_NODE: '${OT_MCP_NODE}', PATH: EMPTY_PATH },
        primary: '',
      });

      expect(outcome.kind === 'resolved' && outcome.version).toBe('v24.18.0');
    });
  });

  describe('when the .nvmrc version is installed', () => {
    it('picks it over newer installs', () => {
      const nvm = makeTempDir();
      installNvmNodes(nvm, ['24.16.0', '24.22.1', '26.0.0']);

      const outcome = resolveNode({
        checkout: makeCheckout({ nvmrc: 'v24.16.0\r\n', range: RANGE }),
        env: { NVM_DIR: nvm, PATH: EMPTY_PATH },
        primary: '',
      });

      expect(outcome).toEqual({
        bin: join(nvm, 'versions', 'node', 'v24.16.0', 'bin'),
        kind: 'resolved',
        version: 'v24.16.0',
      });
    });

    it("prefers the checkout's .nvmrc and falls back to the primary checkout's", () => {
      const nvm = makeTempDir();
      installNvmNodes(nvm, ['22.23.2', '24.16.0', '24.22.1']);
      const primary = makeCheckout({ nvmrc: '22.23.2', range: RANGE });
      const env = { NVM_DIR: nvm, PATH: EMPTY_PATH };

      const own = resolveNode({ checkout: makeCheckout({ nvmrc: '24.16.0', range: RANGE }), env, primary }); // prettier-ignore
      const inherited = resolveNode({ checkout: makeCheckout({ nvmrc: undefined, range: RANGE }), env, primary }); // prettier-ignore

      expect(own.kind === 'resolved' && own.version).toBe('v24.16.0');
      expect(inherited.kind === 'resolved' && inherited.version).toBe('v22.23.2'); // prettier-ignore
    });
  });

  describe('when the .nvmrc version is not usable', () => {
    it('picks the newest install that satisfies engines, comparing numerically', () => {
      const nvm = makeTempDir();
      installNvmNodes(nvm, ['16.17.1', '22.23.2', '23.5.0', '24.16.0', '24.9.0', '25.1.0']); // prettier-ignore

      const outcome = resolveNode({
        checkout: makeCheckout({ nvmrc: '24.18.0', range: RANGE }),
        env: { NVM_DIR: nvm, PATH: EMPTY_PATH },
        primary: '',
      });

      expect(outcome.kind === 'resolved' && outcome.version).toBe('v24.16.0');
    });

    it('skips an alias .nvmrc and one outside engines', () => {
      const nvm = makeTempDir();
      installNvmNodes(nvm, ['22.23.2', '23.5.0']);
      const env = { NVM_DIR: nvm, PATH: EMPTY_PATH };

      const alias = resolveNode({ checkout: makeCheckout({ nvmrc: 'lts/*', range: RANGE }), env, primary: '' }); // prettier-ignore
      const outside = resolveNode({ checkout: makeCheckout({ nvmrc: '23.5.0', range: RANGE }), env, primary: '' }); // prettier-ignore

      expect(alias.kind === 'resolved' && alias.version).toBe('v22.23.2');
      expect(outside.kind === 'resolved' && outside.version).toBe('v22.23.2');
    });
  });

  describe('when no nvm install satisfies engines', () => {
    it("falls back to PATH's node when it satisfies", () => {
      const pathBin = join(makeTempDir(), 'bin');
      installStubNode(pathBin, '24.99.0');

      const outcome = resolveNode({
        checkout: makeCheckout({ nvmrc: '24.18.0', range: RANGE }),
        env: { NVM_DIR: makeTempDir(), PATH: pathBin },
        primary: '',
      });

      expect(outcome).toEqual({ bin: pathBin, kind: 'resolved', version: 'v24.99.0' }); // prettier-ignore
    });

    it("fails, naming what it tried, when PATH's node is too old", () => {
      const nvm = makeTempDir();
      installNvmNodes(nvm, ['16.17.1']);
      const pathBin = join(makeTempDir(), 'bin');
      installStubNode(pathBin, '16.17.1');

      const outcome = resolveNode({
        checkout: makeCheckout({ nvmrc: '24.18.0', range: RANGE }),
        env: { NVM_DIR: nvm, PATH: pathBin },
        primary: '',
      });

      expect(outcome.kind).toBe('failed');
      expect(outcome.kind === 'failed' && outcome.tried).toContain('.nvmrc v24.18.0 (not installed'); // prettier-ignore
      expect(outcome.kind === 'failed' && outcome.tried).toContain('none of 1 nvm installs'); // prettier-ignore
      expect(outcome.kind === 'failed' && outcome.tried).toContain(`PATH node ${pathBin}/node v16.17.1`); // prettier-ignore
    });

    it('fails when there is no node on PATH at all', () => {
      const outcome = resolveNode({
        checkout: makeCheckout({ nvmrc: '24.18.0', range: RANGE }),
        env: { NVM_DIR: makeTempDir(), PATH: EMPTY_PATH },
        primary: '',
      });

      expect(outcome.kind === 'failed' && outcome.tried).toContain('no node on PATH'); // prettier-ignore
    });
  });

  describe('when package.json has no engines.node', () => {
    it('fails before looking for a node', () => {
      const outcome = resolveNode({
        checkout: makeCheckout({ nvmrc: '24.18.0', range: undefined }),
        env: { NVM_DIR: makeTempDir(), PATH: EMPTY_PATH },
        primary: '',
      });

      expect(outcome.kind === 'failed' && outcome.tried).toContain('no engines.node'); // prettier-ignore
    });
  });
});

/**
 * The resolver tests above prove the choice; these prove the shim acts on it —
 * the chosen Node is the one that runs the launcher .ts (and is first on PATH).
 * The stub node announces itself instead of running the launcher, so stdout
 * must stay empty: the shim writes nothing there itself.
 */
describe('the shim runs the launcher on the Node it resolved', () => {
  const SYSTEM_PATH = '/usr/bin:/bin';

  const runShim = (env: Readonly<Record<string, string>>) =>
    spawnSync(BASH, [SHIM], { encoding: 'utf8', env: { ...env }, input: '', timeout: 20_000 }); // prettier-ignore

  it('picks the .nvmrc version even with an old node first on PATH', () => {
    const nvm = makeTempDir();
    installNvmNodes(nvm, [LIVE_NVMRC]);
    const oldBin = join(makeTempDir(), 'bin');
    installStubNode(oldBin, '16.17.1');

    const result = runShim({ HOME: makeTempDir(), NVM_DIR: nvm, PATH: `${oldBin}:${SYSTEM_PATH}` }); // prettier-ignore

    expect(result.stderr).toContain(`FAKE_NODE_RAN v${LIVE_NVMRC}`);
    expect(result.stdout).toBe('');
    expect(result.status).toBe(0);
  });

  it('picks another installed version that satisfies engines when the .nvmrc one is missing', () => {
    const other = ['26.0.0', '24.15.0', '22.22.3'].find((version) => {
      const parsed = parseVersion(version);

      return version !== LIVE_NVMRC && parsed !== null && satisfies(parsed, LIVE_RANGE) === true; // prettier-ignore
    });
    const nvm = makeTempDir();
    installNvmNodes(nvm, other === undefined ? [] : ['16.17.1', other]);

    const result = runShim({ HOME: makeTempDir(), NVM_DIR: nvm, PATH: SYSTEM_PATH }); // prettier-ignore

    expect(other).toBeDefined();
    expect(result.stderr).toContain(`FAKE_NODE_RAN v${other}`);
    expect(result.stdout).toBe('');
  });

  it('exits non-zero with the engines range on stderr when no Node fits', () => {
    const oldBin = join(makeTempDir(), 'bin');
    installStubNode(oldBin, '16.17.1');

    const result = runShim({ HOME: makeTempDir(), NVM_DIR: makeTempDir(), PATH: `${oldBin}:${SYSTEM_PATH}` }); // prettier-ignore

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(LIVE_RANGE);
    expect(result.stderr).not.toContain('FAKE_NODE_RAN');
    expect(result.stdout).toBe('');
  });
});
