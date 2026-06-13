import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { IdeSearchResultRow } from '../IdeSearchResultRow';
import type { SearchMatch } from '../../data/view-models';

const match: SearchMatch = {
  column: 7,
  line: 12,
  lineText: 'const searchText = await runRipgrep(args);',
  matchText: 'search',
  path: 'src/data/search.ts',
};

describe('IdeSearchResultRow Component', () => {
  let component: RenderResult;

  test('renders path and line:column metadata', () => {
    component = render(<IdeSearchResultRow match={match} />);

    expect(component.getByTestId('IdeSearchResultRow')).toBeInTheDocument();
    expect(component.getByText('src/data/search.ts')).toBeInTheDocument();
    expect(component.getByText('12:7')).toBeInTheDocument();
  });

  test('highlights the matched substring within the line', () => {
    component = render(<IdeSearchResultRow match={match} />);

    const mark = component.container.querySelector('mark');
    expect(mark).toBeInTheDocument();
    expect(mark).toHaveTextContent('search');
  });

  test('fires onSelect with the match when activated', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    component = render(
      <IdeSearchResultRow match={match} onSelect={onSelect} />,
    );

    await user.click(component.getByTestId('IdeSearchResultRow'));

    expect(onSelect).toHaveBeenCalledWith(match);
  });
});
