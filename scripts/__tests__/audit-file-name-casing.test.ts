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
  it('covers the React Router tier and the Electron shell, not NestJS', () => {
    for (const directory of [
      'applications/openthrottle-app',
      'applications/openthrottle-developer',
      'applications/openthrottle-server',
      'packages/nestjs-redis',
      'packages/react-router-ui',
    ]) {
      mkdirSync(path.join(root, directory), { recursive: true });
    }

    expect(auditedProjects(root)).toEqual([
      'applications/openthrottle-app',
      'applications/openthrottle-developer',
      'packages/react-router-ui',
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

    expect(findViolations(root)).toEqual([
      { exportName: 'getFoo', file: 'packages/react-router-ui/src/utils/get-foo.ts', suggested: 'getFoo.ts' }, // prettier-ignore
    ]);
  });
});
