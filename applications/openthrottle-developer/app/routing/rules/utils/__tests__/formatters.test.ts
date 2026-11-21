import { describe, expect, test } from 'vitest';

import { RULES_COPY } from '../../data/data.copy';
import { buildRuleScopeTrail, summarizeRuleAction } from '../formatters';

describe('summarizeRuleAction', () => {
  test('summarizes an inject-task payload as skill · placement', () => {
    expect(
      summarizeRuleAction(
        'inject-task',
        '{"placement":"last","skillSlug":"grilling"}',
      ),
    ).toBe('grilling · last');
  });

  test('defaults placement and flags a missing skill', () => {
    expect(summarizeRuleAction('inject-task', '{}')).toBe('(no skill) · first');
  });

  test('summarizes availability-exception as allow/deny counts', () => {
    expect(
      summarizeRuleAction(
        'availability-exception',
        '{"tagAllow":["a","b"],"tagDeny":["c"],"slugAllow":[],"slugDeny":["d","e"]}',
      ),
    ).toBe('allow 2 · deny 3');
  });

  test('summarizes attach-prompt as type: short prompt id · placement', () => {
    expect(
      summarizeRuleAction(
        'attach-prompt',
        '{"placement":"start","promptId":"0123456789abcdef","promptType":"personas"}',
      ),
    ).toBe('personas: 01234567 · start');
  });

  test('summarizes an attach-prompt file path reference and defaults', () => {
    expect(summarizeRuleAction('attach-prompt', '{"filePath":"a/b.md"}')).toBe(
      'prompts: a/b.md · end',
    );
    expect(summarizeRuleAction('attach-prompt', '{}')).toBe(
      'prompts: (no prompt) · end',
    );
  });

  test('degrades gracefully on unparseable JSON', () => {
    expect(summarizeRuleAction('inject-task', 'not json')).toBe(
      'unparseable payload',
    );
  });
});

describe('buildRuleScopeTrail', () => {
  const names = new Map([['repo-1', 'monorepo']]);
  const projects = new Map([['proj-1', 'Platform']]);

  test('a global rule is a single Global step', () => {
    expect(buildRuleScopeTrail({}, names, projects)).toEqual([
      { kind: 'global', label: RULES_COPY.scopeGlobalLabel },
    ]);
  });

  test('orders repository, environment, status', () => {
    expect(
      buildRuleScopeTrail(
        { environment: 'ci', repositoryId: 'repo-1', status: 'PENDING' },
        names,
        projects,
      ),
    ).toEqual([
      { kind: 'repository', label: 'monorepo' },
      { kind: 'environment', label: 'ci' },
      { kind: 'status', label: 'PENDING' },
    ]);
  });

  test('a repository id outside the list becomes the unknown step', () => {
    expect(
      buildRuleScopeTrail({ repositoryId: 'gone' }, names, projects),
    ).toEqual([
      { kind: 'unknown', label: RULES_COPY.scopeUnknownRepositoryLabel },
    ]);
  });

  test('skips blank environment and status', () => {
    expect(
      buildRuleScopeTrail({ environment: '', status: '' }, names, projects),
    ).toHaveLength(1);
  });

  test('a project-only rule is a single Project step, not Global', () => {
    expect(
      buildRuleScopeTrail({ projectId: 'proj-1' }, names, projects),
    ).toEqual([{ kind: 'project', label: 'Platform' }]);
  });

  test('a rule with repository and project shows both, repository first', () => {
    expect(
      buildRuleScopeTrail(
        { projectId: 'proj-1', repositoryId: 'repo-1', status: 'PENDING' },
        names,
        projects,
      ),
    ).toEqual([
      { kind: 'repository', label: 'monorepo' },
      { kind: 'project', label: 'Platform' },
      { kind: 'status', label: 'PENDING' },
    ]);
  });

  test('a project id outside the list becomes the unknown project step', () => {
    expect(buildRuleScopeTrail({ projectId: 'gone' }, names, projects)).toEqual(
      [{ kind: 'unknown', label: RULES_COPY.scopeUnknownProjectLabel }],
    );
  });
});
