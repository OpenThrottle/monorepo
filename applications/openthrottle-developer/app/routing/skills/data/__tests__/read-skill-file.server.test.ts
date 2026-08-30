// @vitest-environment node
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('~/routing/agents/data/resolve-monorepo-root.server', () => ({
  getMonorepoRoot: vi.fn(),
}));

const { getMonorepoRoot } =
  await import('~/routing/agents/data/resolve-monorepo-root.server');
const { readSkillFileBySlug } =
  await import('~/routing/skills/data/read-skill-file.server');

const mockGetMonorepoRoot = vi.mocked(getMonorepoRoot);

const PERSONAL_DIR_ENV = 'OPENTHROTTLE_PERSONAL_SKILLS_DIR';

const AUTHORED_CONTENT = `---
name: authored-skill
description: Authored here.
---

# Authored skill
`;

const PERSONAL_CONTENT = `---
name: my-draft
description: A private draft.
---

# My draft
`;

const tempDirs: string[] = [];

const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'ot-read-skill-'));
  tempDirs.push(dir);
  return dir;
};

const writeSkill = (root: string, slug: string, content: string): string => {
  const skillDir = join(root, slug);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), content);
  return skillDir;
};

const linkIntoRepo = (root: string, slug: string, target: string): void => {
  mkdirSync(join(root, '.agents/skills'), { recursive: true });
  symlinkSync(target, join(root, '.agents/skills', slug));
};

describe('readSkillFileBySlug', () => {
  let originalPersonalDir: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalPersonalDir = process.env[PERSONAL_DIR_ENV];
  });

  afterEach(() => {
    if (originalPersonalDir === undefined) {
      delete process.env[PERSONAL_DIR_ENV];
    } else {
      process.env[PERSONAL_DIR_ENV] = originalPersonalDir;
    }
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        rmSync(dir, { force: true, recursive: true });
      }
    }
  });

  test('reads an authored in-repo skill', () => {
    const root = makeTempDir();
    const authored = writeSkill(
      join(root, 'skills'),
      'authored-skill',
      AUTHORED_CONTENT,
    );
    linkIntoRepo(root, 'authored-skill', authored);
    mockGetMonorepoRoot.mockReturnValue(root);

    const result = readSkillFileBySlug('authored-skill');

    expect(result.entry?.source).toBe('openthrottle');
    expect(result.editable).toBe(true);
    expect(result.content).toContain('# Authored skill');
    expect(result.rawContent).toBe(AUTHORED_CONTENT);
    expect(result.metadata.description).toBe('Authored here.');
  });

  test('reads a personal skill through the in-repo symlink', () => {
    const root = makeTempDir();
    const personalRoot = makeTempDir();
    process.env[PERSONAL_DIR_ENV] = personalRoot;
    linkIntoRepo(
      root,
      'my-draft',
      writeSkill(personalRoot, 'my-draft', PERSONAL_CONTENT),
    );
    mockGetMonorepoRoot.mockReturnValue(root);

    const result = readSkillFileBySlug('my-draft');

    expect(result.entry?.isPersonal).toBe(true);
    expect(result.editable).toBe(true);
    expect(result.content).toContain('# My draft');
    expect(result.rawContent).toBe(PERSONAL_CONTENT);
    expect(result.metadata.description).toBe('A private draft.');
  });

  test('refuses a rogue outside symlink that is not under the personal root', () => {
    const root = makeTempDir();
    const personalRoot = makeTempDir();
    const rogueRoot = makeTempDir();
    process.env[PERSONAL_DIR_ENV] = personalRoot;
    linkIntoRepo(
      root,
      'my-draft',
      writeSkill(rogueRoot, 'my-draft', PERSONAL_CONTENT),
    );
    mockGetMonorepoRoot.mockReturnValue(root);

    const result = readSkillFileBySlug('my-draft');

    expect(result.entry).toBeUndefined();
    expect(result.content).toBe('');
    expect(result.rawContent).toBe('');
  });

  test('returns no entry for an unknown slug', () => {
    const root = makeTempDir();
    mockGetMonorepoRoot.mockReturnValue(root);

    const result = readSkillFileBySlug('not-discovered');

    expect(result.entry).toBeUndefined();
    expect(result.editable).toBe(true);
  });

  test('is not editable when no monorepo root resolves', () => {
    mockGetMonorepoRoot.mockReturnValue(null);

    expect(readSkillFileBySlug('anything')).toEqual({
      content: '',
      editable: false,
      entry: undefined,
      metadata: {},
      rawContent: '',
    });
  });
});
