import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { copyEnvironmentTemplate } from '../setup_environment.ts';

const withTemplate = (
  contents: string,
): { target: string; template: string } => {
  const directory = mkdtempSync(join(tmpdir(), 'ot-env-'));
  const template = join(directory, '.env.default');
  writeFileSync(template, contents);

  return { target: join(directory, '.env'), template };
};

describe('copyEnvironmentTemplate', () => {
  it('fills an empty WEBHOOK_SECRET_ENCRYPTION_KEY with 32 random bytes, base64', () => {
    const { target, template } = withTemplate(
      'A=1\nWEBHOOK_SECRET_ENCRYPTION_KEY=\nB=2\n',
    );

    copyEnvironmentTemplate(template, target);

    const line = readFileSync(target, 'utf8')
      .split('\n')
      .find((entry) => entry.startsWith('WEBHOOK_SECRET_ENCRYPTION_KEY='));
    const value = line?.split('=').slice(1).join('=') ?? '';

    expect(Buffer.from(value, 'base64')).toHaveLength(32);
  });

  it('generates a different key on each run', () => {
    const { target, template } = withTemplate(
      'WEBHOOK_SECRET_ENCRYPTION_KEY=\n',
    );

    copyEnvironmentTemplate(template, target);
    const first = readFileSync(target, 'utf8');
    copyEnvironmentTemplate(template, target);

    expect(readFileSync(target, 'utf8')).not.toBe(first);
  });

  it('leaves a template line that already carries a value alone', () => {
    const { target, template } = withTemplate(
      'WEBHOOK_SECRET_ENCRYPTION_KEY=preset\n',
    );

    copyEnvironmentTemplate(template, target);

    expect(readFileSync(target, 'utf8')).toBe(
      'WEBHOOK_SECRET_ENCRYPTION_KEY=preset\n',
    );
  });

  it('copies a template without the key unchanged', () => {
    const { target, template } = withTemplate('A=1\n');

    copyEnvironmentTemplate(template, target);

    expect(readFileSync(target, 'utf8')).toBe('A=1\n');
  });
});
