import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { auditedProjects, findViolations } from '../audit-file-name-casing.ts';

let root: string;

const write = (relativePath: string, contents: string): void => {
  const full = path.join(root, relativePath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, contents);
};

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'audit-casing-'));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe('auditedProjects', () => {
  it('covers every application, package and tool except the NestJS tier and the Nx plugins', () => {
    for (const directory of [
      'applications/openthrottle-app',
      'applications/openthrottle-developer',
      'applications/openthrottle-server',
      'packages/nestjs-redis',
      'packages/openthrottle-mcp',
      'packages/react-router-ui',
      'tools/dotfiles',
      'tools/nx-plugins',
    ]) {
      mkdirSync(path.join(root, directory), { recursive: true });
    }

    expect(auditedProjects(root)).toEqual([
      'applications/openthrottle-app',
      'applications/openthrottle-developer',
      'packages/openthrottle-mcp',
      'packages/react-router-ui',
      'tools/dotfiles',
    ]);
  });
});

describe('findViolations', () => {
  it('reports a kebab single-export file and skips constants and multi-export modules', () => {
    write('packages/react-router-ui/src/utils/get-foo.ts', 'export const getFoo = () => { return 1; };'); // prettier-ignore
    write('packages/react-router-ui/src/config/ui-status.ts', `export const UI_STATUS = { a: 'a' } as const;`); // prettier-ignore
    write('packages/react-router-ui/src/utils/two-things.ts', 'export const a = 1; export const b = 2;'); // prettier-ignore
    write('packages/react-router-ui/src/utils/getBar.ts', 'export const getBar = 1;'); // prettier-ignore
    write('packages/nestjs-redis/src/get-baz.ts', 'export const getBaz = 1;'); // prettier-ignore
    write('packages/react-router-ui/src/utils/resolve-qux.ts', `export const QUX_KINDS = ['a'] as const; export const resolveQux = () => { return 1; };`); // prettier-ignore

    expect(findViolations(root)).toEqual([
      { exportName: 'getFoo', file: 'packages/react-router-ui/src/utils/get-foo.ts', suggested: 'getFoo.ts' }, // prettier-ignore
      { exportName: 'resolveQux', file: 'packages/react-router-ui/src/utils/resolve-qux.ts', suggested: 'resolveQux.ts' }, // prettier-ignore
    ]);
  });
});
