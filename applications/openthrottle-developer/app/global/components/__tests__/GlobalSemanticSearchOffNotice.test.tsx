import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { SEMANTIC_SEARCH_OFF_COPY } from '~/global/data/copy';
import { SEMANTIC_SEARCH_OFF_STORAGE_KEY } from '~/global/data/semantic-search-off';

import { GlobalSemanticSearchOffNotice } from '../GlobalSemanticSearchOffNotice';

const TEST_ID = 'GlobalSemanticSearchOffNotice';

afterEach(() => {
  window.sessionStorage.clear();
});

describe('GlobalSemanticSearchOffNotice', () => {
  describe('when the search fell back because the embedder is unconfigured', () => {
    test('shows the notice with the fix command', async () => {
      const component = render(
        <GlobalSemanticSearchOffNotice reason="embedder_unconfigured" />,
      );

      await waitFor(() => {
        expect(component.getByTestId(TEST_ID)).toBeInTheDocument();
      });
      expect(component.getByRole('alert')).toHaveTextContent(
        SEMANTIC_SEARCH_OFF_COPY.command,
      );
    });

    test('hides for the session once dismissed', async () => {
      const user = userEvent.setup();
      const component = render(
        <GlobalSemanticSearchOffNotice reason="embedder_unconfigured" />,
      );

      await user.click(
        await component.findByRole('button', {
          name: SEMANTIC_SEARCH_OFF_COPY.dismissLabel,
        }),
      );

      await waitFor(() => {
        expect(component.queryByTestId(TEST_ID)).not.toBeInTheDocument();
      });
      expect(
        window.sessionStorage.getItem(SEMANTIC_SEARCH_OFF_STORAGE_KEY),
      ).toBe('true');
    });

    test('stays hidden when already dismissed this session', async () => {
      window.sessionStorage.setItem(SEMANTIC_SEARCH_OFF_STORAGE_KEY, 'true');

      const component = render(
        <GlobalSemanticSearchOffNotice reason="embedder_unconfigured" />,
      );

      await waitFor(() => {
        expect(component.queryByTestId(TEST_ID)).not.toBeInTheDocument();
      });
    });
  });

  describe('when the search is semantic or fell back for another reason', () => {
    test.each([null, undefined, 'no_embeddings', 'embedder_busy'])(
      'renders nothing for reason %s',
      async (reason) => {
        const component = render(
          <GlobalSemanticSearchOffNotice reason={reason} />,
        );

        await waitFor(() => {
          expect(component.queryByTestId(TEST_ID)).not.toBeInTheDocument();
        });
      },
    );
  });
});
