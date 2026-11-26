import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import {
  CHAT_CHECKOUT_KIND,
  CHAT_PERMISSION_MODE,
  CHAT_REASONING_LEVEL,
} from '../../types';
import { ChatSessionDrawerEnvironment } from '../ChatSessionDrawerEnvironment';

describe('ChatSessionDrawerEnvironment', () => {
  describe('with a full environment', () => {
    test('renders a row per value, with the shortened path as detail', () => {
      const component = render(
        <ChatSessionDrawerEnvironment
          environment={{
            agentLabel: 'Claude Code',
            checkout: {
              branch: 'feat/x',
              filesystemPath: `/Users/me/dev/some/deep/folder/monorepo-worktree`,
              id: 'c1',
              kind: CHAT_CHECKOUT_KIND.worktree,
              label: 'monorepo',
            },
            modelLabel: 'Opus',
            permissionMode: CHAT_PERMISSION_MODE.supervised,
            reasoning: CHAT_REASONING_LEVEL.high,
          }}
        />,
      );

      for (const key of [
        'agent',
        'branch',
        'checkout',
        'model',
        'permissions',
      ]) {
        expect(
          component.getByTestId(`ChatSessionDrawerEnvironment-${key}`),
        ).toBeInTheDocument();
      }
      expect(component.getByTitle('feat/x')).toBeInTheDocument();
      expect(component.getByTitle('Opus · High')).toBeInTheDocument();
      expect(
        component.getByTitle(
          `/Users/me/dev/some/deep/folder/monorepo-worktree`,
        ),
      ).toBeInTheDocument();
    });
  });

  describe('with a partial environment', () => {
    test('omits rows for missing values', () => {
      const component = render(
        <ChatSessionDrawerEnvironment
          environment={{
            agentLabel: undefined,
            checkout: undefined,
            modelLabel: 'Opus',
            permissionMode: undefined,
            reasoning: undefined,
          }}
        />,
      );

      expect(
        component.getByTestId('ChatSessionDrawerEnvironment-model'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('ChatSessionDrawerEnvironment-checkout'),
      ).not.toBeInTheDocument();
      expect(
        component.queryByTestId('ChatSessionDrawerEnvironment-branch'),
      ).not.toBeInTheDocument();
    });
  });

  describe('without an environment', () => {
    test('renders the empty line and no rows', () => {
      const component = render(
        <ChatSessionDrawerEnvironment environment={undefined} />,
      );

      expect(
        component.getByTestId('ChatSessionDrawerEnvironment'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('ChatSessionDrawerEnvironment-model'),
      ).not.toBeInTheDocument();
    });
  });
});
