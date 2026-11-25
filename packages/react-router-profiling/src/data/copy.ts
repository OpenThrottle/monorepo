/**
 * @description Single-sourced user-facing copy for the profiling components.
 * The components render these constants; add new copy here rather than inlining
 * sentence-length literals in components (component-primitive-shape R4).
 */

export const TASK_RUN_INTERPRETATION_HINTS = [
  'RSS (start → end): increase = more process memory used by the end of the run.',
  'Heap (start → end): growth = more JS objects allocated during the run.',
  'CPU user/system delta = CPU time consumed during the run (user = JS/V8, system = kernel e.g. I/O).',
] as const;
