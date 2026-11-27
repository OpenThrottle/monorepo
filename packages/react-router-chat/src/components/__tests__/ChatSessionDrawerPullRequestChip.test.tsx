import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { ChatSessionDrawerPullRequestChip } from '../ChatSessionDrawerPullRequestChip';

describe('ChatSessionDrawerPullRequestChip', () => {
  test('links to the pull request in a new tab', () => {
    const component = render(
      <ChatSessionDrawerPullRequestChip
        pullRequest={{
          number: 7,
          state: 'open',
          url: 'https://github.com/acme/repo/pull/7',
        }}
      />,
    );
    const chip = component.getByRole('link', { name: /#7/ });

    expect(chip).toHaveAttribute('href', 'https://github.com/acme/repo/pull/7');
    expect(chip).toHaveAttribute('target', '_blank');
    expect(chip).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
