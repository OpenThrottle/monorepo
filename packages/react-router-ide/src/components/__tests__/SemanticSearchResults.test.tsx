import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SemanticSearchResults } from '../SemanticSearchResults';
import type { IdeSemanticResult } from '../../data/view-models';

const repository = { displayName: 'Repo One', repositoryId: 'r1' };

function buildResult(
  overrides: Partial<IdeSemanticResult> = {},
): IdeSemanticResult {
  return {
    available: true,
    indexedChunks: 0,
    matches: [],
    query: '',
    repository,
    status: 'ready',
    ...overrides,
  };
}

describe('SemanticSearchResults Component', () => {
  let component: RenderResult;

  test('renders the gated state when the index is unavailable', () => {
    component = render(
      <SemanticSearchResults
        result={buildResult({ available: false, status: 'unavailable' })}
      />,
    );

    expect(
      component.getByText('Semantic index unavailable'),
    ).toBeInTheDocument();
  });

  test('renders a not-indexed prompt when status is notIndexed', () => {
    component = render(
      <SemanticSearchResults result={buildResult({ status: 'notIndexed' })} />,
    );

    expect(component.getByText('Not indexed yet')).toBeInTheDocument();
  });

  test('renders an indexing affordance when status is indexing', () => {
    component = render(
      <SemanticSearchResults result={buildResult({ status: 'indexing' })} />,
    );

    expect(component.getByText('Indexing…')).toBeInTheDocument();
  });

  test('renders a prompt when ready but no query', () => {
    component = render(<SemanticSearchResults result={buildResult()} />);

    expect(component.getByText('Search the codebase')).toBeInTheDocument();
  });

  test('renders matches with score, location, and snippet', () => {
    const result = buildResult({
      indexedChunks: 3,
      matches: [
        {
          content: 'export const auth = () => {};',
          endLine: 12,
          path: 'src/auth.ts',
          score: 0.92,
          startLine: 10,
        },
      ],
      query: 'authentication',
    });
    component = render(<SemanticSearchResults result={result} />);

    expect(component.getByText('0.92')).toBeInTheDocument();
    expect(component.getByText(/src\/auth\.ts:10/)).toBeInTheDocument();
    expect(
      component.getByText('export const auth = () => {};'),
    ).toBeInTheDocument();
  });
});
