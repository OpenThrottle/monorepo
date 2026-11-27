/**
 * Parity gate: for every scenario recorded on both paths, replay the CLI
 * transcript through the per-CLI adapter and the ACP transcript through the
 * ACP backend, reduce both chunk streams to their behavioural shape
 * (`chunkShape`) and compare them.
 *
 * The set of facets that differ must equal exactly what
 * `support/parity-expectations.ts` accounts for: an accepted difference or a
 * known blocker. A new difference fails; so does an entry that no longer
 * reproduces, so fixing a blocker forces its entry out. The verdict per
 * backend follows from the blockers that remain, and is pinned below.
 */

import { describe, expect, it } from 'vitest';

import type { ReplayAcpFixtureOptions, ReplayProfile } from '../src/index.ts';
import {
  answerPermissions,
  ANTIGRAVITY_RECORDING_PROFILE,
  chunkShape,
  compareChunkShapes,
  CURSOR_RECORDING_PROFILE,
  replayFixturePath,
  retirementVerdict,
} from '../src/index.ts';
import {
  ACCEPTED_DIFFERENCES,
  KNOWN_BLOCKERS,
  MISSING_CAPABILITIES,
} from './support/parity-expectations.ts';
import {
  replayAcpStrict,
  replayStrict,
  turnChunks,
} from './support/replay-assertions.ts';

type OnChunk = ReplayAcpFixtureOptions['onChunk'];

interface ParityPair {
  readonly acp: string;
  readonly acpOnChunk: OnChunk;
  /** Which turn of the ACP transcript this CLI transcript corresponds to. */
  readonly acpTurn: number;
  readonly cli: string;
  readonly scenario: string;
}

interface BackendPairs {
  readonly backend: string;
  readonly pairs: readonly ParityPair[];
  readonly profile: ReplayProfile;
}

const pair = (
  scenario: string,
  cli: string,
  acp: string,
  acpTurn = 0,
  acpOnChunk: OnChunk = undefined,
): ParityPair => {
  return { acp, acpOnChunk, acpTurn, cli, scenario };
};

// cursor has no ACP permission-denied transcript: cursor applies the edit
// without asking, so the recorder refused it (see MISSING_CAPABILITIES).
const CURSOR: BackendPairs = {
  backend: 'cursor',
  pairs: [
    pair(
      'accept-edits',
      replayFixturePath('cursor', 'accept-edits'),
      replayFixturePath('cursor', 'acp/accept-edits'),
    ),
    pair(
      'error',
      replayFixturePath('cursor', 'error'),
      replayFixturePath('cursor', 'acp/error'),
    ),
    pair(
      'interrupt',
      replayFixturePath('cursor', 'interrupt'),
      replayFixturePath('cursor', 'acp/interrupt'),
    ),
    pair(
      'multi-tool',
      replayFixturePath('cursor', 'multi-tool'),
      replayFixturePath('cursor', 'acp/multi-tool'),
    ),
    pair(
      'resume#1',
      replayFixturePath('cursor', 'resume.turn-1'),
      replayFixturePath('cursor', 'acp/resume'),
      0,
    ),
    pair(
      'resume#2',
      replayFixturePath('cursor', 'resume.turn-2'),
      replayFixturePath('cursor', 'acp/resume'),
      1,
    ),
    pair(
      'resume.turn-2',
      replayFixturePath('cursor', 'resume.turn-2'),
      replayFixturePath('cursor', 'acp/resume.turn-2'),
    ),
    pair(
      'simple-turn',
      replayFixturePath('cursor', 'simple-turn'),
      replayFixturePath('cursor', 'acp/simple-turn'),
    ),
    pair(
      'system-prompt',
      replayFixturePath('cursor', 'system-prompt'),
      replayFixturePath('cursor', 'acp/system-prompt'),
    ),
    pair(
      'thinking',
      replayFixturePath('cursor', 'thinking'),
      replayFixturePath('cursor', 'acp/thinking'),
    ),
    pair(
      'tool-use',
      replayFixturePath('cursor', 'tool-use'),
      replayFixturePath('cursor', 'acp/tool-use'),
    ),
  ],
  profile: CURSOR_RECORDING_PROFILE,
};

const ANTIGRAVITY: BackendPairs = {
  backend: 'antigravity',
  pairs: [
    pair(
      'accept-edits',
      replayFixturePath('antigravity', 'accept-edits'),
      replayFixturePath('antigravity', 'acp/accept-edits'),
    ),
    pair(
      'error',
      replayFixturePath('antigravity', 'error'),
      replayFixturePath('antigravity', 'acp/error'),
    ),
    pair(
      'interrupt',
      replayFixturePath('antigravity', 'interrupt'),
      replayFixturePath('antigravity', 'acp/interrupt'),
    ),
    pair(
      'multi-tool',
      replayFixturePath('antigravity', 'multi-tool'),
      replayFixturePath('antigravity', 'acp/multi-tool'),
    ),
    pair(
      'permission-denied',
      replayFixturePath('antigravity', 'permission-denied'),
      replayFixturePath('antigravity', 'acp/permission-denied'),
      0,
      answerPermissions(null),
    ),
    pair(
      'resume#1',
      replayFixturePath('antigravity', 'resume.turn-1'),
      replayFixturePath('antigravity', 'acp/resume'),
      0,
    ),
    pair(
      'resume#2',
      replayFixturePath('antigravity', 'resume.turn-2'),
      replayFixturePath('antigravity', 'acp/resume'),
      1,
    ),
    pair(
      'resume.turn-2',
      replayFixturePath('antigravity', 'resume.turn-2'),
      replayFixturePath('antigravity', 'acp/resume.turn-2'),
    ),
    pair(
      'simple-turn',
      replayFixturePath('antigravity', 'simple-turn'),
      replayFixturePath('antigravity', 'acp/simple-turn'),
    ),
    pair(
      'system-prompt',
      replayFixturePath('antigravity', 'system-prompt'),
      replayFixturePath('antigravity', 'acp/system-prompt'),
    ),
    pair(
      'thinking',
      replayFixturePath('antigravity', 'thinking'),
      replayFixturePath('antigravity', 'acp/thinking'),
    ),
    pair(
      'tool-use',
      replayFixturePath('antigravity', 'tool-use'),
      replayFixturePath('antigravity', 'acp/tool-use'),
    ),
  ],
  profile: ANTIGRAVITY_RECORDING_PROFILE,
};

/** Every facet the expectations account for, for one backend and scenario. */
const expectedFacets = (backend: string, scenario: string): string[] => {
  const accepted = ACCEPTED_DIFFERENCES.filter((entry) => {
    return entry.backend === backend && entry.scenario === scenario;
  }).flatMap((entry) => entry.facets);
  const blocked = KNOWN_BLOCKERS.filter((blocker) => {
    return blocker.backend === backend && blocker.scenarios.includes(scenario);
  }).flatMap((blocker) => blocker.facets);
  return [...new Set([...accepted, ...blocked])].toSorted();
};

const verdictFor = (backend: string): ReturnType<typeof retirementVerdict> => {
  return retirementVerdict(
    KNOWN_BLOCKERS.filter((blocker) => blocker.backend === backend).map(
      (blocker) => {
        return {
          reason: blocker.reason,
          ref: `${blocker.id} (${blocker.plan})`,
        };
      },
    ),
    MISSING_CAPABILITIES.filter((entry) => entry.backend === backend).map(
      (entry) => entry.capability,
    ),
  );
};

describe.each([CURSOR, ANTIGRAVITY])(
  '$backend CLI vs ACP parity',
  ({ backend, pairs, profile }) => {
    it.each(pairs)(
      '$scenario differs only where accepted or known',
      async (entry) => {
        const cli = await replayStrict(profile, entry.cli);
        const acp = await replayAcpStrict(entry.acp, entry.acpOnChunk);
        const differences = compareChunkShapes(
          chunkShape(cli.chunks),
          chunkShape(turnChunks(acp, entry.acpTurn)),
        );
        const observed = [
          ...new Set(differences.map((difference) => difference.facet)),
        ].toSorted();

        // On failure the message carries the differences themselves.
        expect(
          { facets: observed, scenario: entry.scenario },
          JSON.stringify(differences, null, 2),
        ).toEqual({
          facets: expectedFacets(backend, entry.scenario),
          scenario: entry.scenario,
        });
      },
    );

    it('every expectation names a scenario this test compares', () => {
      const scenarios = new Set(pairs.map((entry) => entry.scenario));
      const named = [
        ...ACCEPTED_DIFFERENCES.filter(
          (entry) => entry.backend === backend,
        ).map((entry) => entry.scenario),
        ...KNOWN_BLOCKERS.filter(
          (blocker) => blocker.backend === backend,
        ).flatMap((blocker) => blocker.scenarios),
      ];

      expect(named.filter((scenario) => !scenarios.has(scenario))).toEqual([]);
    });
  },
);

describe('retirement verdict', () => {
  // A NO-GO here is the gate that keeps a per-CLI chat adapter alive. When the
  // last blocker and missing capability for a backend are fixed, this flips to
  // GO and must be updated alongside the retirement.
  it.each([
    ['cursor', false],
    ['antigravity', false],
  ])('%s: go = %s', (backend, go) => {
    expect(verdictFor(backend).go).toBe(go);
  });
});
