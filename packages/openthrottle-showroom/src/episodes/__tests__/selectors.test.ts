/**
 * @description Guard the one coupling the move out of `openthrottle-developer`
 * put at risk: a demo flow and the app's E2E suite must drive the SAME test
 * hooks, so the app never grows two parallel sets.
 *
 * While the pipeline lived in `tests/demo/`, next to `tests/e2e/`, a renamed
 * `data-testid` broke both suites at once and someone noticed. From a separate
 * package nothing notices until the next take is recorded — and a failed take
 * costs a re-record, not a red test.
 *
 * So this asserts the cheap half mechanically: every `data-testid` a flow
 * targets still exists in the source that renders it. It does not check the
 * reverse (an app testid with no flow is fine and normal), and it cannot check
 * that the two suites *chose* the same hook — that stays a convention, stated
 * in `AGENTS.md` here and in `tests/e2e/README.md` there.
 *
 * `#id` selectors are deliberately out of scope: those address the pipeline's
 * own typeset surfaces (`../surfaces/`), not the app.
 *
 * The flows come from `../flows.ts`, not from a walk of this directory. A
 * directory walk only sees flows that live where the walk looks, so a flow
 * imported from anywhere else was silently unscanned — and scanning the
 * registry's step objects is also strictly more accurate than regexing source
 * text, because it sees the selector a flow actually targets rather than the
 * literal a file happens to contain.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { FLOWS } from '../flows';
import { repositoryRoot } from '../../runner/format';

/**
 * Directories whose rendered markup a flow is allowed to target.
 *
 * This package is deliberately NOT among them. The flows live under `packages/`
 * too, and a flow's own `[data-testid="X"]` selector string matches the same
 * pattern the scan looks for — so including `packages/` wholesale makes every
 * target satisfy itself and the check passes vacuously. (It did, on the first
 * cut of this file; a deliberately broken selector sailed through.)
 */
const SOURCE_ROOTS = [
  join(repositoryRoot(), 'applications', 'openthrottle-developer', 'app'),
  ...readdirSync(join(repositoryRoot(), 'packages'))
    .filter((entry) => entry.startsWith('react-router-'))
    .map((entry) => join(repositoryRoot(), 'packages', entry)),
];

const TEST_ID_IN_SELECTOR = /\[data-testid="([^"]+)"\]/g;

const sourceFiles = (dir: string): readonly string[] => {
  const entries = readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return entry.name === 'node_modules' || entry.name === 'dist'
        ? []
        : sourceFiles(path);
    }

    return entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')
      ? [path]
      : [];
  });
};

const renderedTestIds = (): ReadonlySet<string> => {
  const found = new Set<string>();

  for (const root of SOURCE_ROOTS) {
    for (const file of sourceFiles(root)) {
      // `dataTestId=` too: toolbar components (PlanTaskToolbar, PlanToolbar, …)
      // set their hook through OpenThrottleToolbar's prop rather than a literal
      // attribute, and the rendered DOM carries it all the same.
      for (const match of readFileSync(file, 'utf8').matchAll(
        /data(?:-t|T)est(?:id|Id)=(?:"([^"]+)"|\{'([^']+)'\})/g,
      )) {
        const id = match[1] ?? match[2];

        if (id !== undefined) {
          found.add(id);
        }
      }
    }
  }

  return found;
};

/** Every selector string a flow puts in front of Playwright. */
const targetedTestIds = (flowId: string): readonly string[] => {
  const flow = FLOWS[flowId];
  const selectors: string[] = Object.values(flow?.regionOfInterest ?? {});

  for (const step of flow?.steps ?? []) {
    if ('selector' in step) {
      selectors.push(step.selector);
    }
  }

  return selectors.flatMap((selector) =>
    [...selector.matchAll(TEST_ID_IN_SELECTOR)].map((match) => match[1] ?? ''),
  );
};

const flowIds = Object.keys(FLOWS).sort();

describe('flow selectors', () => {
  test('there is at least one flow to check', () => {
    expect(flowIds.length).toBeGreaterThan(0);
  });

  test('the scan finds targets at all, so a pass is not vacuous', () => {
    // The first cut of this file passed with an empty target set — a
    // deliberately broken selector sailed through, because the extraction found
    // nothing to check rather than nothing wrong. Assert the extraction works
    // before trusting what it says.
    const targeted = flowIds.flatMap((id) => targetedTestIds(id));

    expect(targeted.length).toBeGreaterThan(0);
    expect(targeted).toContain('PlansTable');
  });

  test.each(flowIds)('%s targets only test ids the app still renders', (id) => {
    const rendered = renderedTestIds();
    const missing = targetedTestIds(id).filter(
      (testId) => !rendered.has(testId),
    );

    expect(
      missing,
      `${id} targets data-testid values nothing renders any more: ${missing.join(', ')}. ` +
        'Either the app renamed a test hook and the flow needs the new one, or the flow is stale. ' +
        'Do not add a second hook for the demo — the E2E suite and the flows share one set.',
    ).toEqual([]);
  });
});

/** Sanity: `statSync` proves the source roots exist rather than silently empty. */
describe('source roots', () => {
  test.each(SOURCE_ROOTS)('%s is a directory', (root) => {
    expect(statSync(root).isDirectory()).toBe(true);
  });
});
