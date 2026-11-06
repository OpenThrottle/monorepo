import { Tabs, TabsList } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TASK_TRAJECTORIES_COPY } from '~/routing/evals/data/data.copy';
import { renderEvals } from '~/routing/evals/testing/render-evals';

import { TaskTrajectoriesTabTrigger } from '../TaskTrajectoriesTabTrigger';

const flags = vi.hoisted(() => {
  return { delta: false };
});

vi.mock('@openthrottle/react-router-utils', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-utils')>();

  return {
    ...actual,
    get FEATURE_DELTA_PREVIEW() {
      return flags.delta;
    },
  };
});

const renderTrigger = () => {
  return renderEvals(
    <Tabs defaultValue="details">
      <TabsList>
        <TaskTrajectoriesTabTrigger />
      </TabsList>
    </Tabs>,
  );
};

describe('TaskTrajectoriesTabTrigger Component', () => {
  beforeEach(() => {
    flags.delta = false;
  });

  describe('when FEATURE_DELTA_PREVIEW is off', () => {
    test('renders no tab', () => {
      expect(renderTrigger().queryByRole('tab')).not.toBeInTheDocument();
    });
  });

  describe('when FEATURE_DELTA_PREVIEW is on', () => {
    test('renders the Trajectories tab', () => {
      flags.delta = true;

      expect(
        renderTrigger().getByRole('tab', { name: TASK_TRAJECTORIES_COPY.tab }),
      ).toBeInTheDocument();
    });
  });
});
