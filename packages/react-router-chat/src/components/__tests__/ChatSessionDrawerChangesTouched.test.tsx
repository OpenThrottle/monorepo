import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { ChatSessionDrawerChangesTouched } from '../ChatSessionDrawerChangesTouched';

describe('ChatSessionDrawerChangesTouched', () => {
  test('lists each file under the heading with its op and counts', () => {
    const component = render(
      <ChatSessionDrawerChangesTouched
        files={[
          {
            added: 2,
            count: 1,
            op: 'edited',
            path: 'src/a.ts',
            removed: 1,
          },
          {
            added: undefined,
            count: 1,
            op: 'deleted',
            path: 'src/b.ts',
            removed: undefined,
          },
        ]}
        heading="Touched in this chat"
      />,
    );
    const rows = component.getAllByTestId(
      'ChatSessionDrawerChangesTouched-row',
    );

    expect(
      component.getByTestId('ChatSessionDrawerChangesTouched'),
    ).toHaveTextContent('Touched in this chat');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('title', 'src/a.ts');
    expect(rows[0]).toHaveTextContent('+2');
    expect(rows[1]).toHaveAttribute('data-op', 'deleted');
    expect(rows[1]).not.toHaveTextContent('+');
  });
});
