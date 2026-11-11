import { describe, expect, it } from 'vitest';

import {
  buildAnalyzeOutput,
  ORGANIZATIONS_EXPLAIN_OUTPUT,
  ORGANIZATIONS_EXPLAIN_RESULT,
  SHIFT_USERS_JOIN_EXPLAIN_OUTPUT,
  USERS_ANALYZE_EXPLAIN_OUTPUT,
  USERS_BITMAP_EXPLAIN_OUTPUT,
  USERS_INDEX_SCAN_EXPLAIN_OUTPUT,
} from './explain-outputs.factory.ts';
import {
  extractExplainOutput,
  summarizeExplainPlan,
} from './explain-plan.utils.ts';

describe('extractExplainOutput', () => {
  describe('when given the real organizations envelope', () => {
    it('returns the object that holds Plan', () => {
      const output = extractExplainOutput(ORGANIZATIONS_EXPLAIN_RESULT);

      expect(output?.Plan['Node Type']).toBe('Limit');
      expect(output?.Plan.Plans?.[0]?.Plans?.[0]?.['Relation Name']).toBe(
        'organizations',
      );
    });

    it('keeps fields that are not in the typed interface', () => {
      const output = extractExplainOutput(ORGANIZATIONS_EXPLAIN_RESULT);

      expect(output?.Plan['Parallel Aware']).toBe(false);
    });

    it('does not carry the wrapper levels', () => {
      expect(
        extractExplainOutput(ORGANIZATIONS_EXPLAIN_RESULT),
      ).not.toHaveProperty('QUERY PLAN');
    });
  });

  describe('when ANALYZE timings are present', () => {
    it('exposes Planning Time and Execution Time', () => {
      const output = extractExplainOutput([
        {
          'QUERY PLAN': [
            {
              'Execution Time': 0.5,
              Plan: { 'Node Type': 'Seq Scan' },
              'Planning Time': 0.1,
            },
          ],
        },
      ]);

      expect(output?.['Planning Time']).toBe(0.1);
      expect(output?.['Execution Time']).toBe(0.5);
    });
  });

  describe('when the shape is unexpected', () => {
    it.each([
      ['an empty array', []],
      ['a non-array object', { 'QUERY PLAN': [] }],
      ['a string', 'plan'],
      ['null', null],
      ['undefined', undefined],
      ['a row without QUERY PLAN', [{ other: 1 }]],
      ['a null first row', [null]],
      ['a non-array QUERY PLAN', [{ 'QUERY PLAN': 'text' }]],
      ['an empty QUERY PLAN', [{ 'QUERY PLAN': [] }]],
      ['an element without Plan', [{ 'QUERY PLAN': [{ Other: 1 }] }]],
      ['a non-object Plan', [{ 'QUERY PLAN': [{ Plan: 'x' }] }]],
      ['a Plan without Node Type', [{ 'QUERY PLAN': [{ Plan: {} }] }]],
      [
        'a non-numeric Planning Time',
        [
          {
            'QUERY PLAN': [
              { Plan: { 'Node Type': 'Seq Scan' }, 'Planning Time': 'slow' },
            ],
          },
        ],
      ],
    ])('returns undefined for %s', (_label, raw) => {
      expect(extractExplainOutput(raw)).toBeUndefined();
    });
  });
});

describe('summarizeExplainPlan', () => {
  describe('when the plan is Limit over Sort over Seq Scan', () => {
    const summary = summarizeExplainPlan(ORGANIZATIONS_EXPLAIN_OUTPUT);

    it('collects the scan with its relation, alias and filter', () => {
      expect(summary.scans).toEqual([
        {
          alias: 'Organization',
          filter: '(deleted_at IS NULL)',
          indexCond: undefined,
          indexName: undefined,
          nodeType: 'Seq Scan',
          relation: 'organizations',
        },
      ]);
    });

    it('collects the sort key', () => {
      expect(summary.sorts).toEqual([
        { nodeType: 'Sort', sortKey: ['updated_at DESC'] },
      ]);
    });

    it('takes the row estimate and cost from the root node', () => {
      expect(summary.estimatedRows).toBe(1);
      expect(summary.totalCost).toBe(10.52);
    });

    it('flags the Seq Scan', () => {
      expect(summary.hasSeqScan).toBe(true);
    });

    it('has no joins', () => {
      expect(summary.joins).toEqual([]);
    });

    it('renders one line', () => {
      expect(summary.line).toBe(
        'Seq Scan organizations [filter: deleted_at IS NULL]; Sort(updated_at DESC) | rows≈1 cost=10.52',
      );
      expect(summary.line).not.toContain('\n');
    });
  });

  describe('when the plan is an Index Scan with an Index Cond', () => {
    const summary = summarizeExplainPlan(USERS_INDEX_SCAN_EXPLAIN_OUTPUT);

    it('collects the index name and condition', () => {
      expect(summary.scans).toEqual([
        expect.objectContaining({
          indexCond: '(id = $1)',
          indexName: 'PK_users',
          nodeType: 'Index Scan',
          relation: 'users',
        }),
      ]);
    });

    it('does not flag a Seq Scan', () => {
      expect(summary.hasSeqScan).toBe(false);
    });

    it('renders the index and condition', () => {
      expect(summary.line).toBe(
        'Index Scan users via PK_users [cond: id = $1] | rows≈1 cost=8.17',
      );
    });
  });

  describe('when the plan is a nested loop over two scans', () => {
    const summary = summarizeExplainPlan(SHIFT_USERS_JOIN_EXPLAIN_OUTPUT);

    it('collects both scans depth-first in tree order', () => {
      expect(summary.scans.map((scan) => scan.nodeType)).toEqual([
        'Seq Scan',
        'Index Scan',
      ]);
    });

    it('collects the join type', () => {
      expect(summary.joins).toEqual([
        { joinType: 'Inner', nodeType: 'Nested Loop' },
      ]);
    });

    it('flags the Seq Scan on the outer side', () => {
      expect(summary.hasSeqScan).toBe(true);
    });

    it('keeps parentheses that do not wrap the whole condition', () => {
      expect(summary.line).toBe(
        'Seq Scan shifts [filter: (status)::text = \'open\'::text]; Index Scan users via PK_users [cond: id = "Shift".user_id]; Nested Loop(Inner) | rows≈12 cost=130.9',
      );
    });
  });

  describe('when the plan is a Bitmap Heap Scan over a Bitmap Index Scan', () => {
    const summary = summarizeExplainPlan(USERS_BITMAP_EXPLAIN_OUTPUT);

    it('collects the heap scan and the index scan', () => {
      expect(summary.scans.map((scan) => scan.nodeType)).toEqual([
        'Bitmap Heap Scan',
        'Bitmap Index Scan',
      ]);
    });

    it('does not flag a Seq Scan', () => {
      expect(summary.hasSeqScan).toBe(false);
    });

    it('renders both scans, the index scan without a relation', () => {
      expect(summary.line).toBe(
        'Bitmap Heap Scan users [filter: deleted_at IS NULL]; Bitmap Index Scan via IDX_users_email [cond: email = $1] | rows≈4 cost=15.62',
      );
    });
  });

  describe('when a node has no scans, sorts or joins', () => {
    it('renders only the metrics', () => {
      const summary = summarizeExplainPlan({
        Plan: {
          'Node Type': 'Result',
          'Plan Rows': 1,
          'Plan Width': 4,
          'Startup Cost': 0,
          'Total Cost': 0.01,
        },
      });

      expect(summary.line).toBe('rows≈1 cost=0.01');
    });
  });

  describe('when the plan has an Incremental Sort', () => {
    it('collects it as a sort', () => {
      const summary = summarizeExplainPlan({
        Plan: {
          'Node Type': 'Incremental Sort',
          'Plan Rows': 5,
          'Plan Width': 4,
          'Sort Key': ['a', 'b DESC'],
          'Startup Cost': 0,
          'Total Cost': 1,
        },
      });

      expect(summary.line).toBe('Incremental Sort(a, b DESC) | rows≈5 cost=1');
    });
  });

  describe('when a method duration is given', () => {
    const planWithDuration = (durationMs?: number): string => {
      return summarizeExplainPlan(USERS_ANALYZE_EXPLAIN_OUTPUT, durationMs)
        .line;
    };

    it('keeps the raw duration in the structured summary', () => {
      expect(
        summarizeExplainPlan(ORGANIZATIONS_EXPLAIN_OUTPUT, 812.37).durationMs,
      ).toBe(812.37);
    });

    it('puts a took= segment ahead of the metrics', () => {
      expect(summarizeExplainPlan(ORGANIZATIONS_EXPLAIN_OUTPUT, 812).line).toBe(
        'Seq Scan organizations [filter: deleted_at IS NULL]; Sort(updated_at DESC) | took=812ms rows≈1 cost=10.52',
      );
    });

    it('places took= before the ANALYZE metrics', () => {
      expect(planWithDuration(45)).toBe(
        'Index Scan users via PK_users [cond: id = 7] | took=45ms rows≈1 cost=8.17 plan=0.071ms exec=0.031ms actual rows=1 (est 1) buffers hit=2 read=0',
      );
    });

    it.each([
      [0, 'took=0ms'],
      [3.26, 'took=3.3ms'],
      [9.96, 'took=10ms'],
      [10.4, 'took=10ms'],
      [812.5, 'took=813ms'],
    ])('renders %j as %j', (durationMs, want) => {
      expect(planWithDuration(durationMs)).toContain(`| ${want} rows≈`);
    });

    it('is absent when no duration is given', () => {
      const summary = summarizeExplainPlan(ORGANIZATIONS_EXPLAIN_OUTPUT);

      expect(summary.durationMs).toBeUndefined();
      expect(summary.line).not.toContain('took=');
    });
  });

  describe('when the output has a Planning Time', () => {
    const summary = summarizeExplainPlan({
      ...ORGANIZATIONS_EXPLAIN_OUTPUT,
      'Planning Time': 0.142,
    });

    it('records it in milliseconds', () => {
      expect(summary.planningTimeMs).toBe(0.142);
    });

    it('appends a plan= segment to the metrics', () => {
      expect(summary.line).toBe(
        'Seq Scan organizations [filter: deleted_at IS NULL]; Sort(updated_at DESC) | rows≈1 cost=10.52 plan=0.142ms',
      );
    });
  });

  describe('when the output has no Planning Time', () => {
    const summary = summarizeExplainPlan(ORGANIZATIONS_EXPLAIN_OUTPUT);

    it('leaves planningTimeMs undefined', () => {
      expect(summary.planningTimeMs).toBeUndefined();
    });

    it('omits the plan= segment', () => {
      expect(summary.line).not.toContain('plan=');
    });
  });

  describe('when the plan comes from ANALYZE', () => {
    const summary = summarizeExplainPlan(USERS_ANALYZE_EXPLAIN_OUTPUT);

    it('records the execution time in milliseconds', () => {
      expect(summary.executionTimeMs).toBe(0.031);
    });

    it('records the root actual rows next to the estimate', () => {
      expect(summary.actualRows).toBe(1);
      expect(summary.estimatedRows).toBe(1);
    });

    it('records the root shared buffer counts', () => {
      expect(summary.sharedHitBlocks).toBe(2);
      expect(summary.sharedReadBlocks).toBe(0);
    });

    it('does not flag an estimate that matches', () => {
      expect(summary.estimateMiss).toBe(false);
    });

    it('renders exec, actual rows and buffers after the estimate metrics', () => {
      expect(summary.line).toBe(
        'Index Scan users via PK_users [cond: id = 7] | rows≈1 cost=8.17 plan=0.071ms exec=0.031ms actual rows=1 (est 1) buffers hit=2 read=0',
      );
      expect(summary.line).not.toContain('\n');
    });
  });

  describe('when the root buffers are cumulative over child nodes', () => {
    it('takes the root values instead of summing the tree', () => {
      const summary = summarizeExplainPlan({
        ...USERS_ANALYZE_EXPLAIN_OUTPUT,
        Plan: {
          ...USERS_ANALYZE_EXPLAIN_OUTPUT.Plan,
          'Node Type': 'Nested Loop',
          Plans: [USERS_ANALYZE_EXPLAIN_OUTPUT.Plan],
          'Shared Hit Blocks': 5,
          'Shared Read Blocks': 3,
        },
      });

      expect(summary.sharedHitBlocks).toBe(5);
      expect(summary.sharedReadBlocks).toBe(3);
    });
  });

  describe('when only some ANALYZE fields are present', () => {
    it('omits the segments whose fields are missing', () => {
      const summary = summarizeExplainPlan({
        Plan: {
          'Node Type': 'Result',
          'Plan Rows': 1,
          'Plan Width': 4,
          'Shared Hit Blocks': 7,
          'Startup Cost': 0,
          'Total Cost': 0.01,
        },
      });

      expect(summary.line).toBe('rows≈1 cost=0.01 buffers hit=7');
    });
  });

  describe('when actual rows differ from the estimate', () => {
    it.each([
      ['under by 10x', 100, 10, true],
      ['over by 10x', 10, 100, true],
      ['under by a large factor', 5000, 3, true],
      ['under by less than 10x', 99, 10, false],
      ['over by less than 10x', 10, 99, false],
      ['a tiny count with a large ratio', 9, 1, false],
      ['zero actual against one estimated', 0, 1, false],
      ['zero actual against a small estimate', 0, 9, false],
      ['zero actual against a large estimate', 0, 500, true],
      ['zero on both sides', 0, 0, false],
    ])('flags %s as miss=%s', (_label, actualRows, estimatedRows, expected) => {
      const summary = summarizeExplainPlan(
        buildAnalyzeOutput(actualRows, estimatedRows),
      );

      expect(summary.estimateMiss).toBe(expected);
      expect(summary.line.includes('estimate-miss')).toBe(expected);
    });

    it('renders the flag after the estimate', () => {
      const summary = summarizeExplainPlan(buildAnalyzeOutput(5000, 3));

      expect(summary.line).toContain('actual rows=5000 (est 3) estimate-miss');
    });
  });

  describe('when the plan has no ANALYZE fields', () => {
    const summary = summarizeExplainPlan(USERS_INDEX_SCAN_EXPLAIN_OUTPUT);

    it('leaves the ANALYZE fields undefined', () => {
      expect(summary.actualRows).toBeUndefined();
      expect(summary.estimateMiss).toBeUndefined();
      expect(summary.executionTimeMs).toBeUndefined();
      expect(summary.sharedHitBlocks).toBeUndefined();
      expect(summary.sharedReadBlocks).toBeUndefined();
    });

    it('keeps the line unchanged', () => {
      expect(summary.line).not.toMatch(/exec=|actual|buffers|estimate-miss/);
    });
  });
});
