import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { DefinitionReferencesPanel } from '../DefinitionReferencesPanel';
import type { IdeSymbolDetails } from '../../data/view-models';

const details: IdeSymbolDetails = {
  definitions: [
    {
      column: 14,
      kind: 'function',
      line: 42,
      name: 'searchText',
      path: 'src/data/search.ts',
    },
  ],
  references: [
    { column: 3, line: 10, path: 'src/a.ts' },
    { column: 7, isWrite: true, line: 20, path: 'src/b.ts' },
  ],
  repository: { displayName: 'Repo One', repositoryId: 'r1' },
  symbol: { line: 42, name: 'searchText', path: 'src/data/search.ts' },
};

describe('DefinitionReferencesPanel Component', () => {
  let component: RenderResult;

  test('renders a loading skeleton state', () => {
    component = render(<DefinitionReferencesPanel loading={true} />);

    expect(
      component.getByTestId('DefinitionReferencesPanel'),
    ).toBeInTheDocument();
    expect(component.queryByRole('tab')).not.toBeInTheDocument();
  });

  test('prompts to select a symbol when no details are given', () => {
    component = render(<DefinitionReferencesPanel details={null} />);

    expect(component.getByText('No symbol selected')).toBeInTheDocument();
  });

  test('renders the symbol header, tab counts, and references by default', () => {
    component = render(<DefinitionReferencesPanel details={details} />);

    expect(component.getByText('searchText')).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: /Definition \(1\)/ }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: /References \(2\)/ }),
    ).toBeInTheDocument();
    expect(component.getByText('src/a.ts')).toBeInTheDocument();
    expect(component.getByText('write')).toBeInTheDocument();
  });

  test('switches to the definition tab on click', async () => {
    const user = userEvent.setup();
    component = render(<DefinitionReferencesPanel details={details} />);

    await user.click(component.getByRole('tab', { name: /Definition \(1\)/ }));

    await waitFor(() => {
      expect(component.queryByText('src/a.ts')).not.toBeInTheDocument();
    });
    expect(component.getByText('42:14')).toBeInTheDocument();
  });
});
