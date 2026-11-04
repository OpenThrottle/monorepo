import { describe, expect, it } from 'vitest';

import type { PlanRunPrTask } from '../plan-run-pr-body.ts';
import {
  buildPlanRunPrBody,
  classifyPlanRunPrBody,
  locatePlanRunPrBody,
  parseOnelineLog,
  parseTaskIdTrailers,
  PLAN_RUN_BODY_CLOSE_MARKER,
  PLAN_RUN_BODY_OPEN_MARKER,
  PR_TEMPLATE_FALLBACK,
  replacePlanRunPrBodyRegion,
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

  it('ignores a bot footer appended after the markers', () => {
    expect(
      classifyPlanRunPrBody(
        `${hostBody}\n<!-- codesmith:footer -->\nReviewed by a bot.\n<!-- /codesmith:footer -->\n`,
      ),
    ).toBe('host');
  });

  it('ignores any unknown bot block above or below the markers', () => {
    const botBlock =
      '<!-- some-future-bot:summary -->\n🤖 Made with a tool.\n<!-- /some-future-bot:summary -->';

    expect(classifyPlanRunPrBody(`${botBlock}\n\n${hostBody}`)).toBe('host');
    expect(classifyPlanRunPrBody(`${hostBody}\n${botBlock}`)).toBe('host');
  });

  it('ignores human prose above or below the markers', () => {
    expect(classifyPlanRunPrBody(`Intro.\n${hostBody}Outro.`)).toBe('host');
  });

  it('treats a body without markers as edited', () => {
    expect(classifyPlanRunPrBody('# Summary\n\nWritten by hand.')).toBe(
      'edited',
    );
  });

  it('treats two marked blocks as edited', () => {
    expect(classifyPlanRunPrBody(`${hostBody}\n${hostBody}`)).toBe('edited');
  });

  it('treats unbalanced markers as edited', () => {
    expect(
      classifyPlanRunPrBody(hostBody.replace(PLAN_RUN_BODY_CLOSE_MARKER, '')),
    ).toBe('edited');
    expect(
      classifyPlanRunPrBody(hostBody.replace(PLAN_RUN_BODY_OPEN_MARKER, '')),
    ).toBe('edited');
    expect(
      classifyPlanRunPrBody(
        `${hostBody}\n${PLAN_RUN_BODY_OPEN_MARKER}\nA stray opener.`,
      ),
    ).toBe('edited');
  });

  it('treats markers in the wrong order, or not on their own line, as edited', () => {
    expect(
      classifyPlanRunPrBody(
        `${PLAN_RUN_BODY_CLOSE_MARKER}\nHost text.\n${PLAN_RUN_BODY_OPEN_MARKER}\n`,
      ),
    ).toBe('edited');
    expect(classifyPlanRunPrBody(`Inline: ${hostBody}`)).toBe('edited');
  });

  it('treats a block with its digest line removed as edited', () => {
    expect(
      classifyPlanRunPrBody(
        hostBody.replace(/<!-- ot:plan-run-digest [^>]*-->\n/, ''),
      ),
    ).toBe('edited');
  });
});

describe('replacePlanRunPrBodyRegion', () => {
  const oldBlock = wrapPlanRunBody('# Summary\n\nOld host text.');
  const newBlock = wrapPlanRunBody('# Summary\n\nNew host text.');

  const refresh = (current: string): string => {
    const region = locatePlanRunPrBody(current);

    if (region.owner === 'edited') {
      throw new Error('expected a refreshable body');
    }

    return replacePlanRunPrBodyRegion({ region, replacement: newBlock });
  };

  it('replaces an empty body outright', () => {
    expect(refresh('')).toBe(newBlock);
  });

  it('replaces only the marked region, keeping a bot footer byte for byte', () => {
    const footer =
      '\n<!-- codesmith:footer -->\r\nReviewed.  \n<!-- /codesmith:footer -->\n';

    expect(refresh(`${oldBlock}${footer}`)).toBe(
      `${newBlock.trimEnd()}\n${footer}`,
    );
  });

  it('keeps human prose above and below the block', () => {
    const refreshed = refresh(`Above.\n\n${oldBlock}\nBelow.`);

    expect(refreshed).toBe(`Above.\n\n${newBlock}\nBelow.`);
    expect(classifyPlanRunPrBody(refreshed)).toBe('host');
  });

  it('is stable across repeated refreshes', () => {
    const once = refresh(`${oldBlock}\nBelow.\n`);

    expect(refresh(once)).toBe(once);
  });

  it('reports an inner edit as edited, so it is never replaced', () => {
    expect(
      locatePlanRunPrBody(oldBlock.replace('Old host text.', 'Mine.')).owner,
    ).toBe('edited');
  });
});
