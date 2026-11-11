import type { PostgresExplainOutput } from '../postgres-profiling.types.ts';

export const ORGANIZATIONS_EXPLAIN_OUTPUT: PostgresExplainOutput = {
  Plan: {
    'Async Capable': false,
    Disabled: false,
    'Node Type': 'Limit',
    'Parallel Aware': false,
    'Plan Rows': 1,
    'Plan Width': 1474,
    Plans: [
      {
        'Async Capable': false,
        Disabled: false,
        'Node Type': 'Sort',
        'Parallel Aware': false,
        'Parent Relationship': 'Outer',
        'Plan Rows': 1,
        'Plan Width': 1474,
        Plans: [
          {
            Alias: 'Organization',
            'Async Capable': false,
            Disabled: false,
            Filter: '(deleted_at IS NULL)',
            'Node Type': 'Seq Scan',
            'Parallel Aware': false,
            'Parent Relationship': 'Outer',
            'Plan Rows': 1,
            'Plan Width': 1474,
            'Relation Name': 'organizations',
            'Startup Cost': 0,
            'Total Cost': 10.5,
          },
        ],
        'Sort Key': ['updated_at DESC'],
        'Startup Cost': 10.51,
        'Total Cost': 10.52,
      },
    ],
    'Startup Cost': 10.51,
    'Total Cost': 10.52,
  },
};

export const ORGANIZATIONS_EXPLAIN_RESULT: readonly unknown[] = [
  { 'QUERY PLAN': [ORGANIZATIONS_EXPLAIN_OUTPUT] },
];

export const USERS_INDEX_SCAN_EXPLAIN_OUTPUT: PostgresExplainOutput = {
  Plan: {
    Alias: 'User',
    'Index Cond': '(id = $1)',
    'Index Name': 'PK_users',
    'Node Type': 'Index Scan',
    'Plan Rows': 1,
    'Plan Width': 812,
    'Relation Name': 'users',
    'Startup Cost': 0.15,
    'Total Cost': 8.17,
  },
};

export const SHIFT_USERS_JOIN_EXPLAIN_OUTPUT: PostgresExplainOutput = {
  Plan: {
    'Join Type': 'Inner',
    'Node Type': 'Nested Loop',
    'Plan Rows': 12,
    'Plan Width': 96,
    Plans: [
      {
        Alias: 'Shift',
        Filter: "((status)::text = 'open'::text)",
        'Node Type': 'Seq Scan',
        'Parent Relationship': 'Outer',
        'Plan Rows': 12,
        'Plan Width': 48,
        'Relation Name': 'shifts',
        'Startup Cost': 0,
        'Total Cost': 21.3,
      },
      {
        Alias: 'User',
        'Index Cond': '(id = "Shift".user_id)',
        'Index Name': 'PK_users',
        'Node Type': 'Index Scan',
        'Parent Relationship': 'Inner',
        'Plan Rows': 1,
        'Plan Width': 48,
        'Relation Name': 'users',
        'Startup Cost': 0.15,
        'Total Cost': 8.17,
      },
    ],
    'Startup Cost': 0.15,
    'Total Cost': 130.9,
  },
};

export const USERS_BITMAP_EXPLAIN_OUTPUT: PostgresExplainOutput = {
  Plan: {
    Alias: 'User',
    Filter: '(deleted_at IS NULL)',
    'Node Type': 'Bitmap Heap Scan',
    'Plan Rows': 4,
    'Plan Width': 812,
    Plans: [
      {
        'Index Cond': '(email = $1)',
        'Index Name': 'IDX_users_email',
        'Node Type': 'Bitmap Index Scan',
        'Parent Relationship': 'Outer',
        'Plan Rows': 4,
        'Plan Width': 0,
        'Startup Cost': 0,
        'Total Cost': 4.3,
      },
    ],
    'Relation Name': 'users',
    'Startup Cost': 4.3,
    'Total Cost': 15.62,
  },
};

export const USERS_INDEX_SCAN_EXPLAIN_RESULT: readonly unknown[] = [
  { 'QUERY PLAN': [USERS_INDEX_SCAN_EXPLAIN_OUTPUT] },
];

export const USERS_ANALYZE_EXPLAIN_OUTPUT: PostgresExplainOutput = {
  'Execution Time': 0.031,
  Plan: {
    'Actual Loops': 1,
    'Actual Rows': 1,
    'Actual Startup Time': 0.012,
    'Actual Total Time': 0.013,
    Alias: 'User',
    'Async Capable': false,
    Disabled: false,
    'Index Cond': '(id = 7)',
    'Index Name': 'PK_users',
    'Node Type': 'Index Scan',
    'Parallel Aware': false,
    'Plan Rows': 1,
    'Plan Width': 412,
    'Relation Name': 'users',
    'Scan Direction': 'Forward',
    'Shared Hit Blocks': 2,
    'Shared Read Blocks': 0,
    'Startup Cost': 0.15,
    'Total Cost': 8.17,
  },
  'Planning Time': 0.071,
};

export const USERS_ANALYZE_EXPLAIN_RESULT: readonly unknown[] = [
  { 'QUERY PLAN': [USERS_ANALYZE_EXPLAIN_OUTPUT] },
];

export const buildAnalyzeOutput = (
  actualRows: number,
  estimatedRows: number,
): PostgresExplainOutput => {
  return {
    ...USERS_ANALYZE_EXPLAIN_OUTPUT,
    Plan: {
      ...USERS_ANALYZE_EXPLAIN_OUTPUT.Plan,
      'Actual Rows': actualRows,
      'Plan Rows': estimatedRows,
    },
  };
};
