import { describe, expect, test } from 'vitest';
import {
  WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE,
  WORKFLOW_RUN_OPTIONS_SEARCH_PARAM,
  isWorkflowRunOptionsExpandedFromSearchParams,
} from '../workflow-run-options-search-param';

describe('workflow-run-options-search-param', () => {
  test('isWorkflowRunOptionsExpandedFromSearchParams is false when param omitted', () => {
    expect(
      isWorkflowRunOptionsExpandedFromSearchParams(new URLSearchParams()),
    ).toBe(false);
  });

  test('isWorkflowRunOptionsExpandedFromSearchParams is true when param is expanded sentinel', () => {
    const q = new URLSearchParams();
    q.set(WORKFLOW_RUN_OPTIONS_SEARCH_PARAM, WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE);
    expect(isWorkflowRunOptionsExpandedFromSearchParams(q)).toBe(true);
  });

  test('isWorkflowRunOptionsExpandedFromSearchParams is false for non-sentinel values', () => {
    const q = new URLSearchParams();
    q.set(WORKFLOW_RUN_OPTIONS_SEARCH_PARAM, 'true');
    expect(isWorkflowRunOptionsExpandedFromSearchParams(q)).toBe(false);
  });
});
