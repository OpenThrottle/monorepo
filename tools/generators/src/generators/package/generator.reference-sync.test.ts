import { afterEach, describe, expect, test, vi } from 'vitest';

import { syncProjectReferences } from './generator';

const execSync = vi.fn();
const readFileSync = vi.fn();

vi.mock('child_process', () => ({
  execSync: (...args: unknown[]) => execSync(...args),
}));
vi.mock('fs', () => ({
  readFileSync: (...args: unknown[]) => readFileSync(...args),
}));

const root = '/repo';
const destination = 'packages/example-xxx-package';

const tsconfigWith = (paths: readonly string[]): string =>
  JSON.stringify({ references: paths.map((path) => ({ path })) });

describe('syncProjectReferences', () => {
  afterEach(() => {
    execSync.mockReset();
    readFileSync.mockReset();
  });

  test('syncs via `pnpm nx sync`', () => {
    readFileSync.mockReturnValue(tsconfigWith([`./${destination}`]));

    syncProjectReferences(root, destination);

    // `nx sync` works because @nx/js:typescript-sync is a `sync.globalGenerators`
    // entry in nx.json — see docs/monorepo/NX.md.
    expect(execSync).toHaveBeenCalledWith(
      'pnpm nx sync',
      expect.objectContaining({ cwd: root }),
    );
  });

  test('succeeds when the reference landed', () => {
    readFileSync.mockReturnValue(
      tsconfigWith(['./packages/other', `./${destination}`]),
    );

    expect(() => syncProjectReferences(root, destination)).not.toThrow();
  });

  test('fails loudly when the reference is still absent', () => {
    readFileSync.mockReturnValue(tsconfigWith(['./packages/other']));

    expect(() => syncProjectReferences(root, destination)).toThrow(
      /PROJECT_REFERENCE_NOT_WIRED/,
    );
  });

  test('fails loudly when the root tsconfig has no references at all', () => {
    readFileSync.mockReturnValue(JSON.stringify({}));

    expect(() => syncProjectReferences(root, destination)).toThrow(
      /PROJECT_REFERENCE_NOT_WIRED/,
    );
  });
});
