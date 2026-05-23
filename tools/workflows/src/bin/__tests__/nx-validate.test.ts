import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveWorkspaceRoot } from '../../utils/nx-validate-workspace';

describe('resolveWorkspaceRoot', () => {
  const originalWorkspaceRoot = process.env.WORKSPACE_ROOT;

  afterEach(() => {
    if (originalWorkspaceRoot === undefined) {
      delete process.env.WORKSPACE_ROOT;
    } else {
      process.env.WORKSPACE_ROOT = originalWorkspaceRoot;
    }
  });

  it('uses WORKSPACE_ROOT when pnpm-workspace.yaml exists there', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-nx-validate-'));
    fs.writeFileSync(path.join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - .\n');
    process.env.WORKSPACE_ROOT = dir;

    expect(resolveWorkspaceRoot('/tmp/anywhere')).toBe(dir);
  });

  it('walks up from startDir to find pnpm-workspace.yaml', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-nx-validate-root-'));
    const nested = path.join(root, 'a', 'b');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(
      path.join(root, 'pnpm-workspace.yaml'),
      'packages:\n  - .\n',
    );
    delete process.env.WORKSPACE_ROOT;

    expect(resolveWorkspaceRoot(nested)).toBe(root);
  });

  it('throws when no workspace marker is found', () => {
    delete process.env.WORKSPACE_ROOT;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-nx-validate-none-'));

    expect(() => resolveWorkspaceRoot(dir)).toThrow(/pnpm-workspace\.yaml/);
  });
});
