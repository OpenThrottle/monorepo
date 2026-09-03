// @vitest-environment node
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { SKILL_CREATE_DESTINATIONS } from '~/routing/skills/config/skill-create';
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';

vi.mock('~/routing/agents/data/discover-repo-skills.server', () => ({
  discoverRepoSkills: vi.fn(),
}));

vi.mock('~/routing/agents/data/resolve-monorepo-root.server', () => ({
  getMonorepoRoot: vi.fn(),
}));

// The subprocess is the ONE thing a unit test must not really run: it would
// mutate the developer's actual checkout. Its own guards are covered separately.
vi.mock('~/routing/skills/data/sync-skill-links.server', () => ({
  syncSkillLinks: vi.fn(),
}));

const { discoverRepoSkills } =
  await import('~/routing/agents/data/discover-repo-skills.server');
const { getMonorepoRoot } =
  await import('~/routing/agents/data/resolve-monorepo-root.server');
const { syncSkillLinks } =
  await import('~/routing/skills/data/sync-skill-links.server');
const { createSkillFile } =
  await import('~/routing/skills/data/create-skill-file.server');

const mockDiscoverRepoSkills = vi.mocked(discoverRepoSkills);
const mockGetMonorepoRoot = vi.mocked(getMonorepoRoot);
const mockSyncSkillLinks = vi.mocked(syncSkillLinks);

const PERSONAL_DIR_ENV = 'OPENTHROTTLE_PERSONAL_SKILLS_DIR';

const SLUG = 'my-new-skill';

const VALID_CONTENT = `---
name: ${SLUG}
description: Does a thing. USE WHEN the thing is needed.
---

# ${SLUG}
`;

describe('createSkillFile', () => {
  let originalPersonalDir: string | undefined;
  let root: string;
  let personalRoot: string;

  const repoSkillPath = (): string => join(root, 'skills', SLUG, 'SKILL.md');
  const personalSkillPath = (): string => join(personalRoot, SLUG, 'SKILL.md');
  const customSkillPath = (): string =>
    join(root, '.agents/skills', SLUG, 'SKILL.md');

  beforeEach(() => {
    vi.clearAllMocks();
    originalPersonalDir = process.env[PERSONAL_DIR_ENV];

    root = mkdtempSync(join(tmpdir(), 'ot-create-skill-repo-'));
    mkdirSync(join(root, 'skills'), { recursive: true });
    mkdirSync(join(root, '.agents/skills'), { recursive: true });

    personalRoot = mkdtempSync(join(tmpdir(), 'ot-create-skill-personal-'));
    process.env[PERSONAL_DIR_ENV] = personalRoot;

    mockGetMonorepoRoot.mockReturnValue(root);
    mockDiscoverRepoSkills.mockReturnValue([]);
    mockSyncSkillLinks.mockReturnValue({ ok: true });
  });

  afterEach(() => {
    if (originalPersonalDir === undefined) {
      delete process.env[PERSONAL_DIR_ENV];
    } else {
      process.env[PERSONAL_DIR_ENV] = originalPersonalDir;
    }
    rmSync(root, { force: true, recursive: true });
    rmSync(personalRoot, { force: true, recursive: true });
  });

  describe('the happy path', () => {
    test('writes to the committed catalog for the repo destination', () => {
      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result).toEqual({ ok: true, slug: SLUG });
      expect(readFileSync(repoSkillPath(), 'utf8')).toBe(VALID_CONTENT);
      expect(existsSync(personalSkillPath())).toBe(false);
    });

    // The custom tier lands as a REAL directory inside .agents/skills — the same
    // shape a lockfile install has, and the shape the managed .gitignore block
    // re-includes, so it is committable the moment it is written.
    test('writes a real directory under .agents/skills for the custom destination', () => {
      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.custom,
        slug: SLUG,
      });

      expect(result).toEqual({ ok: true, slug: SLUG });
      expect(readFileSync(customSkillPath(), 'utf8')).toBe(VALID_CONTENT);
      expect(
        lstatSync(join(root, '.agents/skills', SLUG)).isSymbolicLink(),
      ).toBe(false);
      // Neither of the other two destinations is touched.
      expect(existsSync(repoSkillPath())).toBe(false);
      expect(existsSync(personalSkillPath())).toBe(false);
    });

    test('normalizes CRLF to LF for a custom create too', () => {
      const result = createSkillFile({
        content: VALID_CONTENT.replaceAll('\n', '\r\n'),
        destination: SKILL_CREATE_DESTINATIONS.custom,
        slug: SLUG,
      });

      expect(result).toEqual({ ok: true, slug: SLUG });
      expect(readFileSync(customSkillPath(), 'utf8')).toBe(VALID_CONTENT);
    });

    test('links a custom create in so the per-CLI fan-out dirs get it', () => {
      createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.custom,
        slug: SLUG,
      });

      expect(mockSyncSkillLinks).toHaveBeenCalledWith(root);
    });

    test('writes under the personal root for the personal destination', () => {
      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.personal,
        slug: SLUG,
      });

      expect(result).toEqual({ ok: true, slug: SLUG });
      expect(readFileSync(personalSkillPath(), 'utf8')).toBe(VALID_CONTENT);
      // The repo must stay untouched — a personal create that dirties the
      // worktree defeats the point of the tier.
      expect(existsSync(repoSkillPath())).toBe(false);
    });

    test('creates the personal root when it does not exist yet', () => {
      const missingRoot = join(personalRoot, 'nested', 'not-yet');
      process.env[PERSONAL_DIR_ENV] = missingRoot;

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.personal,
        slug: SLUG,
      });

      expect(result).toEqual({ ok: true, slug: SLUG });
      expect(readFileSync(join(missingRoot, SLUG, 'SKILL.md'), 'utf8')).toBe(
        VALID_CONTENT,
      );
    });

    // Form encoding delivers CRLF regardless of what was typed; a CRLF
    // SKILL.md in a repo of LF files is a diff nobody asked for.
    test('normalizes CRLF content to LF before writing', () => {
      const result = createSkillFile({
        content: VALID_CONTENT.replaceAll('\n', '\r\n'),
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result).toEqual({ ok: true, slug: SLUG });
      expect(readFileSync(repoSkillPath(), 'utf8')).toBe(VALID_CONTENT);
    });

    test('links the new skill in after writing', () => {
      createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(mockSyncSkillLinks).toHaveBeenCalledExactlyOnceWith(root);
    });
  });

  describe('refusals', () => {
    // Every refusal shares this contract: nothing on disk, in either root.
    const expectNothingWritten = (): void => {
      expect(existsSync(repoSkillPath())).toBe(false);
      expect(existsSync(personalSkillPath())).toBe(false);
      expect(existsSync(customSkillPath())).toBe(false);
      expect(existsSync(join(root, 'skills', SLUG))).toBe(false);
      expect(existsSync(join(personalRoot, SLUG))).toBe(false);
      expect(existsSync(join(root, '.agents/skills', SLUG))).toBe(false);
    };

    test('refuses when no monorepo root resolves', () => {
      mockGetMonorepoRoot.mockReturnValue(null);

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result).toEqual({
        error: SKILL_CREATE_COPY.noRootError,
        ok: false,
      });
      expectNothingWritten();
      expect(mockSyncSkillLinks).not.toHaveBeenCalled();
    });

    test.each([
      ['not kebab-case', 'My_Skill'],
      ['a trailing hyphen', 'my-skill-'],
      ['a doubled hyphen', 'my--skill'],
      ['a path separator', 'nested/skill'],
      ['a traversal segment', '../escaped'],
      ['empty', ''],
    ])('refuses a slug that is %s', (_label, slug) => {
      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug,
      });

      expect(result).toEqual({
        error: SKILL_CREATE_COPY.invalidSlugError,
        ok: false,
      });
      expectNothingWritten();
      expect(mockSyncSkillLinks).not.toHaveBeenCalled();
    });

    test('refuses empty content', () => {
      const result = createSkillFile({
        content: '   \n  ',
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result).toEqual({
        error: SKILL_CREATE_COPY.missingContentError,
        ok: false,
      });
      expectNothingWritten();
    });

    test('refuses a personal root inside the repository', () => {
      const insideRoot = join(root, 'personal-skills');
      mkdirSync(insideRoot, { recursive: true });
      process.env[PERSONAL_DIR_ENV] = insideRoot;

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.personal,
        slug: SLUG,
      });

      expect(result).toEqual({
        error: SKILL_CREATE_COPY.personalRootInsideRepoError,
        ok: false,
      });
      expect(existsSync(join(insideRoot, SLUG))).toBe(false);
    });

    // The guard has to answer correctly for a root that does not exist yet —
    // realpath alone fails there and would read as "outside the repo".
    test('refuses a not-yet-created personal root inside the repository', () => {
      process.env[PERSONAL_DIR_ENV] = join(root, 'deep', 'not-yet-created');

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.personal,
        slug: SLUG,
      });

      expect(result).toEqual({
        error: SKILL_CREATE_COPY.personalRootInsideRepoError,
        ok: false,
      });
      expect(existsSync(join(root, 'deep'))).toBe(false);
    });

    test('refuses a personal root pointed at the repository root itself', () => {
      process.env[PERSONAL_DIR_ENV] = root;

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.personal,
        slug: SLUG,
      });

      expect(result).toEqual({
        error: SKILL_CREATE_COPY.personalRootInsideRepoError,
        ok: false,
      });
    });

    test('refuses a slug already committed under skills/', () => {
      mkdirSync(join(root, 'skills', SLUG), { recursive: true });
      writeFileSync(repoSkillPath(), 'existing');

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.personal,
        slug: SLUG,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain(`'${SLUG}'`);
        expect(result.error).toContain('committed');
      }
      // The existing file is untouched and no personal copy appeared.
      expect(readFileSync(repoSkillPath(), 'utf8')).toBe('existing');
      expect(existsSync(personalSkillPath())).toBe(false);
    });

    test('refuses a slug installed in skills-lock.json', () => {
      writeFileSync(
        join(root, 'skills-lock.json'),
        JSON.stringify({
          skills: { [SLUG]: { source: 'owner/repo', sourceType: 'github' } },
        }),
      );

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('skills-lock.json');
      }
      expectNothingWritten();
    });

    test('tolerates a malformed lockfile rather than refusing every create', () => {
      writeFileSync(join(root, 'skills-lock.json'), '{ not json');

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result).toEqual({ ok: true, slug: SLUG });
    });

    test('refuses a slug that already exists in the personal root', () => {
      mkdirSync(join(personalRoot, SLUG), { recursive: true });
      writeFileSync(personalSkillPath(), 'existing');

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('personal skill');
      }
      expect(readFileSync(personalSkillPath(), 'utf8')).toBe('existing');
      expect(existsSync(repoSkillPath())).toBe(false);
    });

    test('refuses a slug already discovered on disk', () => {
      mockDiscoverRepoSkills.mockReturnValue([
        {
          disableModelInvocation: undefined,
          isPersonal: undefined,
          layout: 'agents',
          repoRelativePath: `.agents/skills/${SLUG}/SKILL.md`,
          slug: SLUG,
          source: 'external',
          summary: 'Installed elsewhere.',
          tags: undefined,
        },
      ]);

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('already linked');
      }
      expectNothingWritten();
    });

    // Every collision rule applies to a custom create too — a name taken
    // anywhere is taken, whichever destination you picked.
    test.each([
      [
        'the committed catalog',
        (): void => {
          mkdirSync(join(root, 'skills', SLUG), { recursive: true });
          writeFileSync(repoSkillPath(), 'existing');
        },
        'committed',
      ],
      [
        'the lockfile',
        (): void => {
          writeFileSync(
            join(root, 'skills-lock.json'),
            JSON.stringify({
              skills: {
                [SLUG]: { source: 'owner/repo', sourceType: 'github' },
              },
            }),
          );
        },
        'skills-lock.json',
      ],
      [
        'the personal root',
        (): void => {
          mkdirSync(join(personalRoot, SLUG), { recursive: true });
          writeFileSync(personalSkillPath(), 'existing');
        },
        'personal skill',
      ],
    ])(
      'refuses a custom create colliding with %s',
      (_label, seed, expectedFragment) => {
        seed();

        const result = createSkillFile({
          content: VALID_CONTENT,
          destination: SKILL_CREATE_DESTINATIONS.custom,
          slug: SLUG,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toContain(expectedFragment);
        }
        expect(existsSync(customSkillPath())).toBe(false);
        expect(mockSyncSkillLinks).not.toHaveBeenCalled();
      },
    );

    // Discovery only sees a folder holding a SKILL.md, so a bare directory at
    // the custom target is invisible to it — and mkdir -p would happily fill
    // it. Refuse cleanly rather than writing into someone else's directory.
    test('refuses a custom create over an existing bare .agents/skills directory', () => {
      mkdirSync(join(root, '.agents/skills', SLUG), { recursive: true });

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.custom,
        slug: SLUG,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('.agents/skills');
      }
      expect(existsSync(customSkillPath())).toBe(false);
      expect(mockSyncSkillLinks).not.toHaveBeenCalled();
    });

    test('surfaces a sync failure on a custom create rather than reporting success', () => {
      mockSyncSkillLinks.mockReturnValue({
        error: SKILL_CREATE_COPY.syncFailedError,
        ok: false,
      });

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.custom,
        slug: SLUG,
      });

      expect(result).toEqual({
        error: SKILL_CREATE_COPY.syncFailedError,
        ok: false,
      });
    });

    test('refuses content whose frontmatter does not validate', () => {
      const result = createSkillFile({
        content: '---\ndescription: Missing the name key.\n---\n\n# Broken\n',
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('does not validate');
      }
      expectNothingWritten();
    });

    test('refuses content whose name does not match the slug', () => {
      const result = createSkillFile({
        content:
          '---\nname: different-name\ndescription: Valid but misnamed.\n---\n\n# X\n',
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result.ok).toBe(false);
      expectNothingWritten();
    });

    // Worth pinning down, because it is easy to assume otherwise from the
    // schema alone: `skillFrontmatterSchema` is `.strict()`, but
    // `parseSkillFrontmatterForValidation` hands it a WHITELIST of the four
    // known keys, so an invented key never reaches the schema to be rejected.
    // It is silently dropped at ingest instead — which is exactly why the
    // scaffold must not emit one, and why this is not a refusal.
    test('accepts an invented frontmatter key, which validation drops rather than rejects', () => {
      const content = `---\nname: ${SLUG}\ndescription: Fine.\nauthor: nobody\n---\n\n# X\n`;

      const result = createSkillFile({
        content,
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result).toEqual({ ok: true, slug: SLUG });
      // The file is written verbatim; the key survives on disk and is simply
      // ignored by everything downstream.
      expect(readFileSync(repoSkillPath(), 'utf8')).toBe(content);
    });

    // The file is on disk in this case, so reporting success would send the
    // author to a /skills list their skill is missing from.
    test('reports a sync failure as an error rather than success', () => {
      mockSyncSkillLinks.mockReturnValue({
        error: SKILL_CREATE_COPY.syncFailedError,
        ok: false,
      });

      const result = createSkillFile({
        content: VALID_CONTENT,
        destination: SKILL_CREATE_DESTINATIONS.openthrottle,
        slug: SLUG,
      });

      expect(result).toEqual({
        error: SKILL_CREATE_COPY.syncFailedError,
        ok: false,
      });
      // The write itself did happen — the error says so, and the file stays.
      expect(readFileSync(repoSkillPath(), 'utf8')).toBe(VALID_CONTENT);
    });
  });
});
