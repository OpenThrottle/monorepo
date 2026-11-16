import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ATTRIBUTION_ALTERNATION,
  PULL_REQUEST_TEMPLATE_HEADINGS,
} from './git-text.constants.ts';
import type { GitTextPlan, GitTextTask } from './git-text.types.ts';
import {
  branchNameFor,
  commitMessageFor,
  commitTypeFor,
  conventionalHeader,
  fillPullRequestTemplate,
  pullRequestBodyFor,
  pullRequestTitleFor,
  stripAttributionInline,
  stripAttributionLines,
  wrapText,
} from './git-text.utils.ts';

const REPO_ROOT = join(import.meta.dirname, '../../../../..');

const plan: GitTextPlan = {
  category: 'feature',
  description: `First paragraph of the plan.\n\nSecond paragraph, not in the PR.`,
  id: 'ea4347bf-5cd4-42b3-9c7e-5c1662c135e2',
  summary: null,
  title: 'Source control: forge abstraction & PR sync',
};

const task: GitTextTask = {
  category: 'refactor',
  description: 'Route the ledger through a forge.',
  id: '7f6a827e-ea73-4739-8a89-ec809b1e2aba',
  status: 'COMPLETED',
  summary: null,
  title: 'Put the GitHub-only ledger code behind a forge interface',
};

describe('parity with the repo files a deployed server cannot read', () => {
  it('matches the attribution alternation in attribution-patterns.sh', () => {
    const source = readFileSync(
      join(
        REPO_ROOT,
        'skills/github-pull-request/scripts/attribution-patterns.sh',
      ),
      'utf-8',
    );
    const match = /^OT_ATTRIBUTION_ALTERNATION='(.+)'$/mu.exec(source);

    expect(match?.[1]).toBe(ATTRIBUTION_ALTERNATION);
  });

  it('matches the headings of .github/pull_request_template.md', () => {
    const template = readFileSync(
      join(REPO_ROOT, '.github/pull_request_template.md'),
      'utf-8',
    );
    const headings = template
      .split('\n')
      .filter((line) => /^#{1,6} /u.test(line));

    expect(headings).toEqual(PULL_REQUEST_TEMPLATE_HEADINGS);
  });
});

describe('commitTypeFor', () => {
  it('maps known categories', () => {
    expect(commitTypeFor('Feature')).toBe('feat');
    expect(commitTypeFor('bug')).toBe('fix');
    expect(commitTypeFor('refactor')).toBe('refactor');
  });

  it('falls back to chore for an unknown or missing category', () => {
    expect(commitTypeFor('spike')).toBe('chore');
    expect(commitTypeFor(null)).toBe('chore');
  });
});

describe('attribution stripping', () => {
  it('drops a credit line in any casing but keeps prose that mentions one', () => {
    const text = `Body line.\nCo-Authored-By: Some Model <x@y>\n🤖 Generated with Tool\nA library made with care.`;

    expect(stripAttributionLines(text)).toBe(
      'Body line.\nA library made with care.',
    );
  });

  it('cuts an inline credit off a single-line field', () => {
    expect(stripAttributionInline('feat: thing 🤖 Generated with X')).toBe(
      'feat: thing',
    );
  });
});

describe('wrapText', () => {
  it('wraps long lines and hangs list continuations under the item', () => {
    const wrapped = wrapText(`- ${'word '.repeat(30).trim()}`, 40);

    for (const line of wrapped.split('\n')) {
      expect(line.length).toBeLessThanOrEqual(40);
    }
    expect(wrapped.split('\n')[1]?.startsWith('  word')).toBe(true);
  });

  it('leaves fenced code alone', () => {
    const code = `\`\`\`\n${'x'.repeat(120)}\n\`\`\``;

    expect(wrapText(code, 40)).toBe(code);
  });
});

describe('branchNameFor', () => {
  it('slugs the title and suffixes the plan id prefix', () => {
    expect(branchNameFor(plan)).toBe(
      'ot/source-control-forge-abstraction-pr-sync-ea4347bf',
    );
  });

  it('falls back to the id alone when the title has nothing sluggable', () => {
    expect(branchNameFor({ ...plan, title: '!!!' })).toBe('ot/ea4347bf');
  });
});

describe('conventionalHeader', () => {
  it('lower-cases the subject, drops a trailing period and caps the length', () => {
    expect(conventionalHeader('feat', 'x', 'Add a thing.')).toBe(
      'feat(x): add a thing',
    );
    expect(
      conventionalHeader('feat', 'x', 'a'.repeat(200)).length,
    ).toBeLessThanOrEqual(100);
  });
});

describe('commitMessageFor', () => {
  it('builds header, body and both footers', () => {
    expect(commitMessageFor(plan, task, 'openthrottle-server')).toBe(
      [
        'refactor(openthrottle-server): put the GitHub-only ledger code behind a forge interface',
        'Route the ledger through a forge.',
        `Plan-Id: ${plan.id}\nTask-Id: ${task.id}`,
      ].join('\n\n'),
    );
  });

  it('omits the body when the task has no prose', () => {
    const message = commitMessageFor(
      plan,
      { ...task, description: null },
      'monorepo',
    );

    expect(message.split('\n\n')).toHaveLength(2);
  });
});

describe('pull request drafts', () => {
  it('titles the PR from the plan', () => {
    expect(pullRequestTitleFor(plan, 'monorepo')).toBe(
      'feat(monorepo): source control: forge abstraction & PR sync',
    );
  });

  it('fills the template headings in order, flags unfinished tasks and keeps the Testing TODO', () => {
    const body = pullRequestBodyFor(
      plan,
      [task, { ...task, id: 't2', status: 'BLOCKED', title: 'Second task' }],
      null,
    );
    const positions = PULL_REQUEST_TEMPLATE_HEADINGS.map((heading) =>
      body.indexOf(`${heading}\n`),
    );

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(body).toContain('First paragraph of the plan.');
    expect(body).not.toContain('Second paragraph');
    expect(body).toContain('- Second task (BLOCKED)');
    expect(body).toContain('**TODO:** Provide steps to test');
    expect(body.endsWith(`Plan-Id: ${plan.id}`)).toBe(true);
  });

  it('never carries a credit line from plan prose', () => {
    const body = pullRequestBodyFor(
      { ...plan, summary: 'Did it.\nCo-authored-by: Bot <b@x>' },
      [],
      null,
    );

    expect(body.toLowerCase()).not.toContain('co-authored-by');
  });
});

describe('scope', () => {
  it('omits the scope when there is none, the portable default', () => {
    expect(conventionalHeader('fix', null, 'Handle it')).toBe('fix: handle it');
    expect(pullRequestTitleFor(plan, null)).toBe(
      'feat: source control: forge abstraction & PR sync',
    );
  });
});

describe('fillPullRequestTemplate', () => {
  const foreign = [
    '## What',
    '',
    '<!-- describe the change -->',
    '',
    '## How to test',
    '',
    '1. Steps go here',
    '',
    '## Checklist',
    '',
    '- [ ] Docs updated',
  ].join('\n');

  it('replaces only the first section and keeps every other heading and checklist', () => {
    const filled = fillPullRequestTemplate(foreign, 'The summary.');

    expect(filled.startsWith('## What\n\nThe summary.\n\n## How to test')).toBe(
      true,
    );
    expect(filled).not.toContain('<!-- describe the change -->');
    expect(filled).toContain('1. Steps go here');
    expect(filled).toContain('- [ ] Docs updated');
  });

  it('puts the summary above a template with no headings', () => {
    expect(fillPullRequestTemplate('- [ ] Tested', 'S.')).toBe(
      'S.\n\n- [ ] Tested',
    );
  });

  it('is what the body uses when a template is given, footer appended', () => {
    const body = pullRequestBodyFor(plan, [task], foreign);

    expect(body).toContain('## Checklist');
    expect(body).not.toContain('## Review focus');
    expect(body.endsWith(`Plan-Id: ${plan.id}`)).toBe(true);
  });
});
