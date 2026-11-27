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
          headBranch={undefined}
          pullRequest={undefined}
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
          headBranch={undefined}
          pullRequest={undefined}
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
        <ChatSessionDrawerEnvironment
          environment={undefined}
          headBranch={undefined}
          pullRequest={undefined}
        />,
      );

      expect(
        component.getByTestId('ChatSessionDrawerEnvironment'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('ChatSessionDrawerEnvironment-model'),
      ).not.toBeInTheDocument();
    });
  });

  describe('with a live branch and pull request', () => {
    const environment = {
      agentLabel: undefined,
      checkout: {
        branch: 'main',
        filesystemPath: undefined,
        id: 'c1',
        kind: CHAT_CHECKOUT_KIND.primary,
        label: 'monorepo',
      },
      modelLabel: undefined,
      permissionMode: undefined,
      reasoning: undefined,
    };

    test('shows the live branch over the checkout list branch', () => {
      const component = render(
        <ChatSessionDrawerEnvironment
          environment={environment}
          headBranch="feat/live"
          pullRequest={undefined}
        />,
      );

      expect(
        component.getByTestId('ChatSessionDrawerEnvironment-branch'),
      ).toHaveTextContent('feat/live');
      expect(component.queryByTitle('main')).not.toBeInTheDocument();
    });

    test('puts the pull request chip first, above the checkout', () => {
      const component = render(
        <ChatSessionDrawerEnvironment
          environment={environment}
          headBranch="feat/live"
          pullRequest={{
            number: 7,
            state: 'open',
            url: 'https://github.com/acme/repo/pull/7',
          }}
        />,
      );
      const items = component.getAllByRole('listitem');

      expect(items[0]).toHaveAttribute(
        'data-testid',
        'ChatSessionDrawerEnvironment-pullRequest',
      );
      expect(items[0]).toContainElement(
        component.getByRole('link', { name: /#7/ }),
      );
      expect(items[1]).toHaveAttribute(
        'data-testid',
        'ChatSessionDrawerEnvironment-checkout',
      );
    });
  });
});
