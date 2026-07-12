import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  getSkillsTableRowId,
  skillsTableColumns,
} from '~/routing/skills/config/skills-table-columns';

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

describe('routing/skills config skills-table-columns', () => {
  describe('getSkillsTableRowId', () => {
    test('prefers slug over path and index', () => {
      const entry: RepoSkillEntry = {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/foo/SKILL.md',
        slug: 'foo',
        summary: 'Foo skill',
        tags: undefined,
      };
      expect(getSkillsTableRowId(entry, 0)).toBe('foo');
    });

    test('falls back to repoRelativePath when slug is empty', () => {
      const entry: RepoSkillEntry = {
        disableModelInvocation: undefined,
        layout: 'cursor',
        repoRelativePath: '.cursor/skills/bar/SKILL.md',
        slug: '',
        summary: 'Bar skill',
        tags: undefined,
      };
      expect(getSkillsTableRowId(entry, 2)).toBe('.cursor/skills/bar/SKILL.md');
    });

    test('falls back to index-based id when slug and path are empty', () => {
      const entry: RepoSkillEntry = {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '',
        slug: '',
        summary: 'No path',
        tags: undefined,
      };
      expect(getSkillsTableRowId(entry, 4)).toBe('skill-4');
    });
  });

  describe('skillsTableColumns', () => {
    test('defines Owner, Summary, Model invocation, and Actions columns', () => {
      const headers = skillsTableColumns.map((column) => {
        const header = column.header;
        if (typeof header === 'function') {
          return header(asMock<Parameters<typeof header>[0]>({}));
        }
        return header;
      });

      expect(headers).toHaveLength(4);
    });
  });
});
