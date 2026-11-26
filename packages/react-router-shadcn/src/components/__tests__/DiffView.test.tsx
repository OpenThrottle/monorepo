import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { DiffView } from '../DiffView';

const PATCH = [
  'diff --git a/a.ts b/a.ts',
  'index 111..222 100644',
  '--- a/a.ts',
  '+++ b/a.ts',
  '@@ -1,2 +1,2 @@',
  ' keep',
  '-old',
  '+new',
  '',
].join('\n');

describe('DiffView', () => {
  describe('when the patch has lines', () => {
    test('tones each line by kind', () => {
      const component = render(<DiffView patch={PATCH} />);
      const kinds = component
        .getAllByTestId('DiffView-line')
        .map((line) => line.getAttribute('data-kind'));

      expect(kinds).toEqual([
        'meta',
        'meta',
        'meta',
        'meta',
        'hunk',
        'context',
        'remove',
        'add',
      ]);
    });

    test('does not mistake an added line starting with ++ for a header', () => {
      const component = render(
        <DiffView patch={['@@ -0,0 +1 @@', '+++counter'].join('\n')} />,
      );
      const lines = component.getAllByTestId('DiffView-line');

      expect(lines[1]).toHaveAttribute('data-kind', 'add');
    });

    test('merges the caller className', () => {
      const component = render(<DiffView className="max-h-40" patch={PATCH} />);

      expect(component.getByTestId('DiffView')).toHaveClass('max-h-40');
    });
  });

  describe('when the patch is empty', () => {
    test('renders the empty label and no lines', () => {
      const component = render(<DiffView patch="" />);

      expect(component.queryByTestId('DiffView-line')).toBeNull();
      expect(component.getByTestId('DiffView')).toHaveTextContent(
        'No changes to show.',
      );
    });
  });
});
