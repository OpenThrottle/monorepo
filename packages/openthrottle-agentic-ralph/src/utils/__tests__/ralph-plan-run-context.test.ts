import { describe, expect, it } from 'vitest';
import { DEFAULT_ITERATIONS, DEFAULT_RUNNER } from '../../config/index.js';
import { resolveWorkflowRunOptions } from '../context.js';

const PLAN_ID = '0f9e1a94-8d39-4aa7-ada2-2d107d41ab37';

describe('resolveWorkflowRunOptions iterations resolver', () => {
  it('falls back to DEFAULT_ITERATIONS when iterations is null/undefined', () => {
    const context = resolveWorkflowRunOptions({ planId: PLAN_ID });

    expect(context.iterations).toBe(DEFAULT_ITERATIONS);
    expect(context.iterationMax).toBe(DEFAULT_ITERATIONS);
  });

  it('falls back to DEFAULT_ITERATIONS when iterations is non-positive', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { iterations: 0 },
    });

    expect(context.iterations).toBe(DEFAULT_ITERATIONS);
  });

  it('falls back to DEFAULT_ITERATIONS when iterations is negative', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { iterations: -5 },
    });

    expect(context.iterations).toBe(DEFAULT_ITERATIONS);
  });

  it('falls back to DEFAULT_ITERATIONS when iterations is a non-integer', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { iterations: 2.5 },
    });

    expect(context.iterations).toBe(DEFAULT_ITERATIONS);
  });

  it('keeps a valid positive integer iterations value', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { iterations: 7 },
    });

    expect(context.iterations).toBe(7);
    expect(context.iterationMax).toBe(7);
  });
});

describe('resolveWorkflowRunOptions iteration timeout resolver', () => {
  it('returns undefined when the timeout is null/undefined', () => {
    const context = resolveWorkflowRunOptions({ planId: PLAN_ID });

    expect(context.iterationTimeout).toBeUndefined();
    expect(context.timeout).toBeUndefined();
  });

  it('returns undefined when the timeout is non-positive', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { iterationTimeoutSeconds: 0 },
    });

    expect(context.iterationTimeout).toBeUndefined();
  });

  it('returns undefined when the timeout is a non-integer', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { iterationTimeoutSeconds: 1.5 },
    });

    expect(context.iterationTimeout).toBeUndefined();
  });

  it('keeps a valid positive integer timeout value', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { iterationTimeoutSeconds: 120 },
    });

    expect(context.iterationTimeout).toBe(120);
    expect(context.timeout).toBe(120);
  });
});

describe('resolveWorkflowRunOptions execution-backend resolver', () => {
  it('falls back to DEFAULT_RUNNER when backend is null/undefined', () => {
    const context = resolveWorkflowRunOptions({ planId: PLAN_ID });

    expect(context.runner).toBe(DEFAULT_RUNNER);
  });

  it('falls back to DEFAULT_RUNNER when backend is an empty string', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { backend: '' },
    });

    expect(context.runner).toBe(DEFAULT_RUNNER);
  });

  it('falls back to DEFAULT_RUNNER for an unknown backend id', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { backend: 'not-a-real-backend' },
    });

    expect(context.runner).toBe(DEFAULT_RUNNER);
  });

  it('normalizes a known backend id (trim + lowercase)', () => {
    const context = resolveWorkflowRunOptions({
      planId: PLAN_ID,
      ralph: { backend: '  CLAUDE  ' },
    });

    expect(context.runner).toBe('claude');
  });

  it('prefers ralph.backend over the top-level executionBackend', () => {
    const context = resolveWorkflowRunOptions({
      executionBackend: 'opencode',
      planId: PLAN_ID,
      ralph: { backend: 'claude' },
    });

    expect(context.runner).toBe('claude');
  });

  it('falls back to the top-level executionBackend when ralph.backend is absent', () => {
    const context = resolveWorkflowRunOptions({
      executionBackend: 'opencode',
      planId: PLAN_ID,
    });

    expect(context.runner).toBe('opencode');
  });
});
