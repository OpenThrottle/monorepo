import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderEvals } from '~/routing/evals/testing/renderEvals';
import type { TrajectoryScoring } from '~/routing/evals/types';

import { TrajectoryScoreNext } from '../TrajectoryScoreNext';

const scoring = (next: TrajectoryScoring['next']): TrajectoryScoring => {
  return { next, scoredCount: 1, trajectoryCount: 3 };
};

const nextKind = (container: HTMLElement): string | null => {
  return (
    container
      .querySelector('[data-next-kind]')
      ?.getAttribute('data-next-kind') ?? null
  );
};

describe('TrajectoryScoreNext Component', () => {
  describe('before you label the trajectory', () => {
    test('shows progress but offers no next step', () => {
      const component = renderEvals(
        <TrajectoryScoreNext
          isLabelled={false}
          scoring={scoring({ kind: 'in-plan', trajectoryId: 't-2' })}
        />,
      );

      expect(component.getByRole('progressbar')).toBeInTheDocument();
      expect(nextKind(component.container)).toBeNull();
    });
  });

  describe('once you have labelled it', () => {
    test('links the next unscored trajectory in this plan', () => {
      const component = renderEvals(
        <TrajectoryScoreNext
          isLabelled={true}
          scoring={scoring({ kind: 'in-plan', trajectoryId: 't-2' })}
        />,
      );

      expect(component.getByRole('link')).toHaveAttribute(
        'href',
        '/evals/trajectories/t-2',
      );
      expect(nextKind(component.container)).toBe('in-plan');
    });

    test('falls back to the next plan', () => {
      const component = renderEvals(
        <TrajectoryScoreNext
          isLabelled={true}
          scoring={scoring({
            kind: 'next-plan',
            planTitle: 'Beta',
            trajectoryId: 'b-1',
          })}
        />,
      );

      expect(component.getByRole('link')).toHaveAttribute(
        'href',
        '/evals/trajectories/b-1',
      );
      expect(nextKind(component.container)).toBe('next-plan');
    });

    test('says everything is scored and links back to the list', () => {
      const component = renderEvals(
        <TrajectoryScoreNext
          isLabelled={true}
          scoring={scoring({ kind: 'all-scored' })}
        />,
      );

      expect(component.getByRole('link')).toHaveAttribute(
        'href',
        '/evals/trajectories',
      );
      expect(nextKind(component.container)).toBe('all-scored');
    });
  });

  describe('without a plan', () => {
    test('shows no progress', () => {
      const component = renderEvals(
        <TrajectoryScoreNext
          isLabelled={false}
          scoring={{
            next: { kind: 'all-scored' },
            scoredCount: 0,
            trajectoryCount: 0,
          }}
        />,
      );

      expect(component.queryByRole('progressbar')).toBeNull();
    });
  });
});
