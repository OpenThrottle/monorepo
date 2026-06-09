import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SemanticSearchResults } from '../SemanticSearchResults';
import type { IdeSemanticResult } from '../../data/view-models';

const repository = { displayName: 'Repo One', repositoryId: 'r1' };

describe('SemanticSearchResults Component', () => {
  let component: RenderResult;

  test('renders the gated state when the index is unavailable', () => {
    const result: IdeSemanticResult = {
      available: false,
      matches: [],
      query: '',
      repository,
    };
    component = render(<SemanticSearchResults result={result} />);

    expect(
      component.getByText('Semantic index unavailable'),
    ).toBeInTheDocument();
  });

  test('renders a prompt when available but no query', () => {
    const result: IdeSemanticResult = {
      available: true,
      matches: [],
      query: '',
      repository,
    };
    component = render(<SemanticSearchResults result={result} />);

    expect(component.getByText('Search the codebase')).toBeInTheDocument();
  });

  test('renders matches with score, location, and snippet', () => {
    const result: IdeSemanticResult = {
      available: true,
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
      repository,
    };
    component = render(<SemanticSearchResults result={result} />);

    expect(component.getByText('0.92')).toBeInTheDocument();
    expect(component.getByText(/src\/auth\.ts:10/)).toBeInTheDocument();
    expect(
      component.getByText('export const auth = () => {};'),
    ).toBeInTheDocument();
  });
});
