// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import {
  discoverRepoPersonas,
  findRepoPersonaBySlug,
  readRepoPersonaFileContent,
} from '~/routing/agents/data/discover-repo-personas.server';

const tempDirs: string[] = [];

const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ot-discover-personas-'));
  tempDirs.push(dir);
  return dir;
};

const writePersona = (
  root: string,
  fileName: string,
  frontmatter: string,
  body = '# Persona',
): void => {
  const personasDir = join(root, '.agents/personas');
  mkdirSync(personasDir, { recursive: true });
  writeFileSync(
    join(personasDir, fileName),
    `---\n${frontmatter}\n---\n\n${body}\n`,
  );
};

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { force: true, recursive: true });
    }
  }
});

describe('discoverRepoPersonas', () => {
  test('returns empty list when monorepo root is null', () => {
    expect(discoverRepoPersonas(null)).toEqual([]);
  });

  test('discovers personas and sorts by slug', () => {
    const root = makeTempDir();

    writePersona(
      root,
      'zebra.md',
      'name: zebra\ndescription: Zebra persona lens.',
    );
    writePersona(
      root,
      'architect.md',
      'name: architect\ndescription: Architecture lens.',
    );

    expect(discoverRepoPersonas(root)).toEqual([
      {
        repoRelativePath: '.agents/personas/architect.md',
        slug: 'architect',
        summary: 'Architecture lens.',
      },
      {
        repoRelativePath: '.agents/personas/zebra.md',
        slug: 'zebra',
        summary: 'Zebra persona lens.',
      },
    ]);
  });

  test('skips README and _template files', () => {
    const root = makeTempDir();

    writePersona(root, 'README.md', 'name: readme\ndescription: Index.');
    writePersona(
      root,
      '_template.md',
      'name: template\ndescription: Template.',
    );
    writePersona(
      root,
      'product.md',
      'name: product\ndescription: Product lens.',
    );

    expect(discoverRepoPersonas(root)).toEqual([
      {
        repoRelativePath: '.agents/personas/product.md',
        slug: 'product',
        summary: 'Product lens.',
      },
    ]);
  });
});

describe('findRepoPersonaBySlug', () => {
  test('returns matching persona entry', () => {
    const root = makeTempDir();
    writePersona(root, 'legal.md', 'name: legal\ndescription: Legal review.');

    expect(findRepoPersonaBySlug(root, 'legal')).toEqual({
      repoRelativePath: '.agents/personas/legal.md',
      slug: 'legal',
      summary: 'Legal review.',
    });
  });

  test('returns null when slug is missing', () => {
    const root = makeTempDir();
    writePersona(root, 'legal.md', 'name: legal\ndescription: Legal review.');

    expect(findRepoPersonaBySlug(root, 'missing')).toBeNull();
  });
});

describe('readRepoPersonaFileContent', () => {
  test('reads persona markdown from disk', () => {
    const root = makeTempDir();
    writePersona(root, 'growth.md', 'name: growth\ndescription: Growth lens.');

    const content = readRepoPersonaFileContent(
      root,
      '.agents/personas/growth.md',
    );

    expect(content).toContain('name: growth');
    expect(content).toContain('# Persona');
  });
});
