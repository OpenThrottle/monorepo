import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { ChatSessionDrawerChangesPatch } from '../ChatSessionDrawerChangesPatch';

describe('ChatSessionDrawerChangesPatch', () => {
  test('renders the patch as a labelled diff region', () => {
    const component = render(
      <ChatSessionDrawerChangesPatch
        isBinary={false}
        isTruncated={false}
        patch={'@@ -1 +1 @@\n-a\n+b\n'}
        path="src/a.ts"
      />,
    );

    expect(
      component.getByRole('region', { name: 'Patch for src/a.ts' }),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatSessionDrawerChangesPatch-note'),
    ).toBeNull();
  });

  test('says it is loading while the patch is undefined', () => {
    const component = render(
      <ChatSessionDrawerChangesPatch
        isBinary={false}
        isTruncated={false}
        patch={undefined}
        path="src/a.ts"
      />,
    );

    expect(
      component.getByTestId('ChatSessionDrawerChangesPatch-note'),
    ).toHaveTextContent('Loading patch');
  });

  test('says a binary file has no patch', () => {
    const component = render(
      <ChatSessionDrawerChangesPatch
        isBinary={true}
        isTruncated={false}
        patch={undefined}
        path="a.png"
      />,
    );

    expect(
      component.getByTestId('ChatSessionDrawerChangesPatch-note'),
    ).toHaveTextContent('Binary file');
  });

  test('notes a truncated patch', () => {
    const component = render(
      <ChatSessionDrawerChangesPatch
        isBinary={false}
        isTruncated={true}
        patch="@@ -1 +1 @@\n+a\n"
        path="src/a.ts"
      />,
    );

    expect(
      component.getByTestId('ChatSessionDrawerChangesPatch-note'),
    ).toHaveTextContent('Patch truncated');
  });
});
