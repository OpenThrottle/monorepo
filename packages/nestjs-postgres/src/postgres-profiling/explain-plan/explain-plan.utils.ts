import {
  POSTGRES_EXPLAIN_DURATION_DECIMAL_BELOW_MS,
  POSTGRES_EXPLAIN_ESTIMATE_MISS_FACTOR,
  POSTGRES_EXPLAIN_ESTIMATE_MISS_MIN_ROWS,
  POSTGRES_EXPLAIN_NODE_TYPES,
  POSTGRES_EXPLAIN_SCAN_NODE_PATTERN,
  POSTGRES_EXPLAIN_SORT_NODE_TYPES,
} from '../postgres-profiling.constants.ts';
import type {
  PostgresExplainCollectedNodes,
  PostgresExplainJoinSummary,
  PostgresExplainOutput,
  PostgresExplainPlanNode,
  PostgresExplainScanSummary,
  PostgresExplainSortSummary,
  PostgresExplainSummary,
} from '../postgres-profiling.types.ts';

const isObject = (candidate: unknown): candidate is object => {
  return typeof candidate === 'object' && candidate !== null;
};

const hasOptionalNumber = (candidate: object, key: string): boolean => {
  return (
    !(key in candidate) ||
    Reflect.get(candidate, key) === undefined ||
    typeof Reflect.get(candidate, key) === 'number'
  );
};

/**
 * @description Narrows to the single object `EXPLAIN (FORMAT JSON)` returns. Only the
 * root node's `Node Type` and the two timing fields are checked.
 */
export const isExplainOutput = (
  candidate: unknown,
): candidate is PostgresExplainOutput => {
  if (!isObject(candidate) || !('Plan' in candidate)) {
    return false;
  }

  const { Plan: plan } = candidate;

  return (
    isObject(plan) &&
    'Node Type' in plan &&
    typeof plan['Node Type'] === 'string' &&
    hasOptionalNumber(candidate, 'Planning Time') &&
    hasOptionalNumber(candidate, 'Execution Time')
  );
};

/**
 * @description Unwraps the `[{ "QUERY PLAN": [{ Plan }] }]` envelope that
 * `manager.query` returns for `EXPLAIN (FORMAT JSON)`. Only the root node and the
 * two timing fields are checked; deeper nodes are trusted. Returns `undefined`
 * for any other shape and never throws.
 */
export const extractExplainOutput = (
  raw: unknown,
): PostgresExplainOutput | undefined => {
  if (!Array.isArray(raw)) {
    return undefined;
  }

  const firstRow: unknown = raw[0];

  if (!isObject(firstRow) || !('QUERY PLAN' in firstRow)) {
    return undefined;
  }

  const queryPlan: unknown = firstRow['QUERY PLAN'];

  if (!Array.isArray(queryPlan)) {
    return undefined;
  }

  const output: unknown = queryPlan[0];

  return isExplainOutput(output) ? output : undefined;
};

const collectNodes = (
  node: PostgresExplainPlanNode,
  collected: PostgresExplainCollectedNodes,
): void => {
  const nodeType = node['Node Type'];

  if (POSTGRES_EXPLAIN_SCAN_NODE_PATTERN.test(nodeType)) {
    collected.scans.push({
      alias: node.Alias,
      filter: node.Filter,
      indexCond: node['Index Cond'],
      indexName: node['Index Name'],
      nodeType,
      relation: node['Relation Name'],
    });
  }

  if (POSTGRES_EXPLAIN_SORT_NODE_TYPES.includes(nodeType) && node['Sort Key']) {
    collected.sorts.push({ nodeType, sortKey: node['Sort Key'] });
  }

  if (node['Join Type']) {
    collected.joins.push({ joinType: node['Join Type'], nodeType });
  }

  for (const childNode of node.Plans ?? []) {
    collectNodes(childNode, collected);
  }
};

// Postgres wraps every condition in parentheses; drop them only when one pair spans the whole text.
const stripOuterParentheses = (expression: string): string => {
  if (!expression.startsWith('(') || !expression.endsWith(')')) {
    return expression;
  }

  let depth = 0;

  for (let index = 0; index < expression.length - 1; index += 1) {
    depth += expression[index] === '(' ? 1 : 0;
    depth -= expression[index] === ')' ? 1 : 0;

    if (depth === 0) {
      return expression;
    }
  }

  return expression.slice(1, -1);
};

const formatScanSegment = (scan: PostgresExplainScanSummary): string => {
  const conditions = [
    scan.indexCond
      ? `cond: ${stripOuterParentheses(scan.indexCond)}`
      : undefined,
    scan.filter ? `filter: ${stripOuterParentheses(scan.filter)}` : undefined,
  ].filter((condition) => condition !== undefined);

  return [
    scan.nodeType,
    scan.relation,
    scan.indexName ? `via ${scan.indexName}` : undefined,
    conditions.length > 0 ? `[${conditions.join(', ')}]` : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(' ');
};

const formatSortSegment = (sort: PostgresExplainSortSummary): string => {
  return `${sort.nodeType}(${sort.sortKey.join(', ')})`;
};

const formatJoinSegment = (join: PostgresExplainJoinSummary): string => {
  return `${join.nodeType}(${join.joinType})`;
};

// Compared by multiplication so a zero count never divides.
const isEstimateMiss = (actualRows: number, estimatedRows: number): boolean => {
  return (
    Math.max(actualRows, estimatedRows) >=
      POSTGRES_EXPLAIN_ESTIMATE_MISS_MIN_ROWS &&
    Math.max(actualRows, estimatedRows) >=
      Math.min(actualRows, estimatedRows) *
        POSTGRES_EXPLAIN_ESTIMATE_MISS_FACTOR
  );
};

const formatActualRowsSegment = (
  summary: Omit<PostgresExplainSummary, 'line'>,
): string | undefined => {
  if (summary.actualRows === undefined) {
    return undefined;
  }

  return [
    `actual rows=${summary.actualRows} (est ${summary.estimatedRows})`,
    summary.estimateMiss ? 'estimate-miss' : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(' ');
};

const formatBuffersSegment = (
  summary: Omit<PostgresExplainSummary, 'line'>,
): string | undefined => {
  const parts = [
    summary.sharedHitBlocks === undefined
      ? undefined
      : `hit=${summary.sharedHitBlocks}`,
    summary.sharedReadBlocks === undefined
      ? undefined
      : `read=${summary.sharedReadBlocks}`,
  ].filter((part) => part !== undefined);

  return parts.length === 0 ? undefined : `buffers ${parts.join(' ')}`;
};

const formatDurationMs = (durationMs: number): string => {
  const oneDecimal = Math.round(durationMs * 10) / 10;

  return oneDecimal < POSTGRES_EXPLAIN_DURATION_DECIMAL_BELOW_MS
    ? `${oneDecimal}ms`
    : `${Math.round(durationMs)}ms`;
};

const formatLine = (summary: Omit<PostgresExplainSummary, 'line'>): string => {
  const planSegments = [
    ...summary.scans.map(formatScanSegment),
    ...summary.joins.map(formatJoinSegment),
    ...summary.sorts.map(formatSortSegment),
  ];
  const metricSegments = [
    summary.durationMs === undefined
      ? undefined
      : `took=${formatDurationMs(summary.durationMs)}`,
    `rows≈${summary.estimatedRows}`,
    `cost=${summary.totalCost}`,
    summary.planningTimeMs === undefined
      ? undefined
      : `plan=${summary.planningTimeMs}ms`,
    summary.executionTimeMs === undefined
      ? undefined
      : `exec=${summary.executionTimeMs}ms`,
    formatActualRowsSegment(summary),
    formatBuffersSegment(summary),
  ].filter((segment) => segment !== undefined);

  return [planSegments.join('; '), metricSegments.join(' ')]
    .filter((section) => section !== '')
    .join(' | ');
};

/**
 * @description Walks the plan depth-first and condenses it into the scans, sorts
 * and joins it contains, the root row estimate and cost, and a one-line rendering.
 * For an ANALYZE plan it adds execution time, root actual rows (flagging a 10x
 * estimate miss) and the root's cumulative shared buffer counts. When `durationMs` (the decorated
 * method's whole-call duration, not the plan's) is given it is kept raw and rendered as `took=`
 * ahead of the metrics. Pure: no I/O, no logging, never throws for a well-formed plan.
 */
export const summarizeExplainPlan = (
  output: PostgresExplainOutput,
  durationMs?: number,
): PostgresExplainSummary => {
  const collected: PostgresExplainCollectedNodes = {
    joins: [],
    scans: [],
    sorts: [],
  };

  collectNodes(output.Plan, collected);

  const estimatedRows = output.Plan['Plan Rows'];
  const actualRows = output.Plan['Actual Rows'];
  const hasActualRows = actualRows !== undefined;
  const estimateMiss = hasActualRows
    ? isEstimateMiss(actualRows, estimatedRows)
    : undefined;
  const summary: Omit<PostgresExplainSummary, 'line'> = {
    actualRows,
    durationMs,
    estimateMiss,
    estimatedRows,
    executionTimeMs: output['Execution Time'],
    hasSeqScan: collected.scans.some(
      (scan) => scan.nodeType === POSTGRES_EXPLAIN_NODE_TYPES.SEQ_SCAN,
    ),
    joins: collected.joins,
    planningTimeMs: output['Planning Time'],
    scans: collected.scans,
    sharedHitBlocks: output.Plan['Shared Hit Blocks'],
    sharedReadBlocks: output.Plan['Shared Read Blocks'],
    sorts: collected.sorts,
    totalCost: output.Plan['Total Cost'],
  };

  return { ...summary, line: formatLine(summary) };
};
