import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { RepositoryCheckoutFieldsFragment } from '~/__generated__/graphql';
import { REPOSITORY_AGENT_CONFIG_TRUST_COPY } from '~/routing/settings/repositories/data/data.copy';
import { mockCheckout } from '~/routing/settings/repositories/testing/mock-repositories';

import { RepositoryAgentConfigTrust } from '../RepositoryAgentConfigTrust';

interface ActionOutcome {
  errorMessage: string | null;
  repositoryId: string;
  trusted: boolean;
}

const ACTION_TEST_ID = 'RepositoryAgentConfigTrust-action';
const COUNTS_TEST_ID = 'RepositoryAgentConfigTrust-counts';

const renderTrust = (
  checkouts: readonly RepositoryCheckoutFieldsFragment[],
  onSubmit: (formData: FormData) => Promise<ActionOutcome> = async () => ({
    errorMessage: null,
    repositoryId: 'repo-1',
    trusted: true,
  }),
) => {
  const Component = () => {
    return (
      <RepositoryAgentConfigTrust checkouts={checkouts} repositoryId="repo-1" />
    );
  };
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    {
      action: async ({ request }: { request: Request }) =>
        onSubmit(await request.formData()),
      path: '/resources/repository-agent-config-trust',
    },
  ]);

  return render(<RoutesStub />);
};

describe('RepositoryAgentConfigTrust Component', () => {
  describe('when the repository is OpenThrottle itself', () => {
    test('shows it as always trusted with no action', () => {
      const component = renderTrust([
        mockCheckout({ id: 'ot', isForeign: false }),
      ]);

      expect(
        component.getByText(REPOSITORY_AGENT_CONFIG_TRUST_COPY.alwaysTrusted),
      ).toBeInTheDocument();
      expect(component.queryByTestId(ACTION_TEST_ID)).not.toBeInTheDocument();
    });
  });

  describe('when a foreign repository is untrusted', () => {
    test('shows the untrusted state, the counts and a trust action', () => {
      const component = renderTrust([
        mockCheckout({
          branch: 'main',
          hookCount: 2,
          id: 'a',
          mcpServerCount: 1,
        }),
      ]);

      expect(
        component.getByText(REPOSITORY_AGENT_CONFIG_TRUST_COPY.untrusted),
      ).toBeInTheDocument();
      expect(component.getByTestId(COUNTS_TEST_ID)).toHaveTextContent('2');
      expect(component.getByTestId(COUNTS_TEST_ID)).toHaveTextContent('1');
      expect(component.getByTestId(ACTION_TEST_ID)).toHaveTextContent(
        REPOSITORY_AGENT_CONFIG_TRUST_COPY.trustButton,
      );
    });

    test('posts trusted=true for the repository and reflects it', async () => {
      const onSubmit = vi.fn(async (_formData: FormData) => ({
        errorMessage: null,
        repositoryId: 'repo-1',
        trusted: true,
      }));
      const component = renderTrust(
        [mockCheckout({ branch: 'main', id: 'a' })],
        onSubmit,
      );

      await userEvent.click(component.getByTestId(ACTION_TEST_ID));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
      const [formData] = onSubmit.mock.calls[0] ?? [];
      expect(formData?.get('trusted')).toBe('true');
      expect(formData?.get('repositoryId')).toBe('repo-1');
    });

    test('shows the error when the flip fails', async () => {
      const component = renderTrust(
        [mockCheckout({ branch: 'main', id: 'a' })],
        async () => ({
          errorMessage: 'nope',
          repositoryId: 'repo-1',
          trusted: false,
        }),
      );

      await userEvent.click(component.getByTestId(ACTION_TEST_ID));

      await waitFor(() => {
        expect(component.getByText('nope')).toBeInTheDocument();
      });
    });
  });

  describe('when a foreign repository is trusted', () => {
    test('shows the trusted state and a revoke action', () => {
      const component = renderTrust([
        mockCheckout({ agentConfigTrusted: true, branch: 'main', id: 'a' }),
      ]);

      expect(
        component.getByText(REPOSITORY_AGENT_CONFIG_TRUST_COPY.trusted),
      ).toBeInTheDocument();
      expect(component.getByTestId(ACTION_TEST_ID)).toHaveTextContent(
        REPOSITORY_AGENT_CONFIG_TRUST_COPY.revokeButton,
      );
    });
  });

  describe('when no checkout has been scanned', () => {
    test('says the counts are not known yet', () => {
      const component = renderTrust([mockCheckout({ branch: null, id: 'a' })]);

      expect(component.getByTestId(COUNTS_TEST_ID)).toHaveTextContent(
        REPOSITORY_AGENT_CONFIG_TRUST_COPY.notScanned,
      );
    });
  });
});
