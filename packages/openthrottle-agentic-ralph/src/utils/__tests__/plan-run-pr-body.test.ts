import { describe, expect, it } from 'vitest';

import type { PlanRunPrTask } from '../plan-run-pr-body.ts';
import {
  buildPlanRunPrBody,
  classifyPlanRunPrBody,
  parseOnelineLog,
  parseTaskIdTrailers,
  PLAN_RUN_BODY_CLOSE_MARKER,
  PLAN_RUN_BODY_OPEN_MARKER,
  PR_TEMPLATE_FALLBACK,
  resolvePlanRunPrTitle,
  selectFooterTaskIds,
  wrapPlanRunBody,
} from '../plan-run-pr-body.ts';

const PLAN_ID = '19fceffc-3e3b-4843-8b83-13509573c9f9';
const PLAN = {
  description: undefined,
  summary: undefined,
  title: 'Plan-run PRs draft their body from the branch',
};

const task = (
  id: string,
  status: string,
  summary: string | undefined = undefined,
): PlanRunPrTask => ({ id, status, summary, title: `Task ${id}` });

describe('parseOnelineLog', () => {
  it('splits sha and subject and skips blank lines', () => {
    expect(parseOnelineLog('abc123 feat: one\n\ndef456 fix(x): two\n')).toEqual(
      [
        { sha: 'abc123', subject: 'feat: one' },
        { sha: 'def456', subject: 'fix(x): two' },
      ],
    );
  });
});

describe('parseTaskIdTrailers', () => {
  it('collects unique Task-Id values only', () => {
    expect(
      parseTaskIdTrailers(
        'Plan-Id: p\nTask-Id: a\n\nTask-Id: b\nTask-Id: a\nnot Task-Id: c\n',
      ),
    ).toEqual(['a', 'b']);
  });
});

describe('selectFooterTaskIds', () => {
  it('keeps COMPLETED tasks not already on the base, in task order', () => {
    expect(
      selectFooterTaskIds({
        rangeTaskIds: [],
        taskIdsOnBase: new Set(['on-main']),
        tasks: [
          task('a', 'COMPLETED'),
          task('blocked', 'BLOCKED'),
          task('on-main', 'COMPLETED'),
          task('b', 'COMPLETED'),
        ],
      }),
    ).toEqual(['a', 'b']);
  });

  it('falls back to the range trailers when OT tasks are unavailable', () => {
    expect(
      selectFooterTaskIds({
        rangeTaskIds: ['from-git'],
        taskIdsOnBase: new Set(),
        tasks: undefined,
      }),
    ).toEqual(['from-git']);
  });
});

describe('resolvePlanRunPrTitle', () => {
  it('keeps the subject of a single commit', () => {
    expect(
      resolvePlanRunPrTitle({
        commits: [{ sha: 'a', subject: 'fix(api): handle nulls' }],
        plan: PLAN,
        planId: PLAN_ID,
      }),
    ).toBe('fix(api): handle nulls');
  });

  it('uses the most significant type and scope with the plan title for several commits', () => {
    expect(
      resolvePlanRunPrTitle({
        commits: [
          { sha: 'c', subject: 'docs(skills): note the contract' },
          {
            sha: 'b',
            subject: 'feat(openthrottle-agentic-ralph): draft bodies',
          },
          { sha: 'a', subject: 'fix(openthrottle-agentic-ralph): base range' },
        ],
        plan: PLAN,
        planId: PLAN_ID,
      }),
    ).toBe(
      'feat(openthrottle-agentic-ralph): plan-run PRs draft their body from the branch',
    );
  });

  it('carries a breaking marker from any commit', () => {
    expect(
      resolvePlanRunPrTitle({
        commits: [
          { sha: 'b', subject: 'fix!: drop the flag' },
          { sha: 'a', subject: 'chore: tidy' },
        ],
        plan: { ...PLAN, title: 'OT plan output.' },
        planId: PLAN_ID,
      }),
    ).toBe('fix!: OT plan output');
  });

  it('falls back to the tip subject without a plan, and to a plan default without commits', () => {
    const commits = [
      { sha: 'b', subject: 'feat: two' },
      { sha: 'a', subject: 'feat: one' },
    ];
    expect(
      resolvePlanRunPrTitle({ commits, plan: undefined, planId: PLAN_ID }),
    ).toBe('feat: two');
    expect(
      resolvePlanRunPrTitle({ commits: [], plan: PLAN, planId: PLAN_ID }),
    ).toBe('chore: complete plan 19fceffc');
  });
});

describe('buildPlanRunPrBody', () => {
  const template = `${PR_TEMPLATE_FALLBACK}- [ ] **TODO:** Provide steps to test the changes fully\n`;

  it('drops the testing TODO and keeps the pipelines line when no task has a summary', () => {
    const body = buildPlanRunPrBody({
      commits: [{ sha: 'a1', subject: 'feat: one' }],
      footerTaskIds: ['t1'],
      plan: PLAN,
      planId: PLAN_ID,
      tasks: [task('t1', 'COMPLETED')],
      template,
    });

    expect(body).not.toContain('TODO');
    expect(body).toContain('- [ ] Pipelines should be passing');
    expect(body).not.toContain('- [ ] Check');
  });

  it('turns completed task summaries into testing steps', () => {
    const body = buildPlanRunPrBody({
      commits: [],
      footerTaskIds: [],
      plan: PLAN,
      planId: PLAN_ID,
      tasks: [
        task('t1', 'COMPLETED', '\n- Run the finalize suite\nmore detail'),
      ],
      template,
    });

    expect(body).toContain('- [ ] Check Task t1: Run the finalize suite');
    expect(body).toContain('- Task t1 — Run the finalize suite');
  });

  it('appends a Summary section when the template has no summary TODO', () => {
    const body = buildPlanRunPrBody({
      commits: [{ sha: 'a1', subject: 'feat: one' }],
      footerTaskIds: [],
      plan: undefined,
      planId: PLAN_ID,
      tasks: [],
      template: '## Notes\n',
    });

    expect(body).toContain('## Notes\n\n## Summary');
    expect(body).toContain(`Plan \`${PLAN_ID}\` run.`);
  });

  it('ends with the footer block inside the host markers', () => {
    const body = buildPlanRunPrBody({
      commits: [],
      footerTaskIds: ['t1', 't2'],
      plan: PLAN,
      planId: PLAN_ID,
      tasks: [],
      template,
    });

    expect(body.startsWith(`${PLAN_RUN_BODY_OPEN_MARKER}\n`)).toBe(true);
    expect(body).toMatch(
      new RegExp(
        `\\n\\nPlan-Id: ${PLAN_ID}\\nTask-Id: t1\\nTask-Id: t2\\n<!-- ot:plan-run-digest sha256:[0-9a-f]{64} -->\\n${PLAN_RUN_BODY_CLOSE_MARKER.replace('/', '\\/')}\\n$`,
      ),
    );
    expect(classifyPlanRunPrBody(body)).toBe('host');
  });
});

describe('classifyPlanRunPrBody', () => {
  const hostBody = wrapPlanRunBody('# Summary\n\nHost text.\n\nPlan-Id: p');

  it('treats an empty or whitespace body as empty', () => {
    expect(classifyPlanRunPrBody('  \n')).toBe('empty');
  });

  it('recognises an untouched host body, even with CRLF line endings', () => {
    expect(classifyPlanRunPrBody(hostBody)).toBe('host');
    expect(classifyPlanRunPrBody(hostBody.replace(/\n/g, '\r\n'))).toBe('host');
  });

  it('treats an edit inside the markers as human-edited', () => {
    expect(classifyPlanRunPrBody(hostBody.replace('Host text.', 'Mine.'))).toBe(
      'edited',
    );
  });

  it('treats text outside the markers as human-edited', () => {
    expect(classifyPlanRunPrBody(`Intro.\n${hostBody}`)).toBe('edited');
  });

  it('treats a body without markers as human-edited', () => {
    expect(classifyPlanRunPrBody('# Summary\n\nWritten by hand.')).toBe(
      'edited',
    );
  });
});
