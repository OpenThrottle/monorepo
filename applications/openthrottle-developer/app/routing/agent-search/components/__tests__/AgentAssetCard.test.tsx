import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import { AgentAssetCard } from '~/routing/agent-search/components/AgentAssetCard';
import type { AgentAssetResult } from '~/routing/agent-search/types';

const dbSkill: AgentAssetResult = {
  content: 'Run /github/commit after each task.',
  customPromptId: 'cp-1',
  description: 'Commit guidance',
  filePath: '.agents/skills/git-commit/SKILL.md',
  id: 'chunk-1',
  labels: ['git'],
  promptType: 'skills',
  similarity: 0.91,
  source: 'db',
  title: 'git-commit',
};

const diskPersona: AgentAssetResult = {
  content: 'Domain lens for architecture and schema-compatibility review.',
  customPromptId: null,
  description: null,
  filePath: '.agents/personas/architect.md',
  id: 'disk:personas:.agents/personas/architect.md',
  labels: [],
  promptType: 'personas',
  similarity: null,
  source: 'disk',
  title: 'architect',
};

const renderCard = (result: AgentAssetResult) =>
  render(
    <MemoryRouter>
      <AgentAssetCard result={result} />
    </MemoryRouter>,
  );

describe('AgentAssetCard', () => {
  test('renders an indexed (db) skill with similarity and a link to /skills', () => {
    const component = renderCard(dbSkill);

    expect(component.getByTestId('AgentAssetCard-typeBadge')).toHaveTextContent(
      'Skill',
    );
    expect(
      component.getByTestId('AgentAssetCard-sourceBadge'),
    ).toHaveTextContent('indexed');
    expect(
      component.getByTestId('AgentAssetCard-similarity'),
    ).toHaveTextContent('Relevance: 91%');
    expect(component.getByTestId('AgentAssetCard-link')).toHaveAttribute(
      'href',
      '/skills',
    );
  });

  test('renders an on-disk persona with its file path and no similarity', () => {
    const component = renderCard(diskPersona);

    expect(component.getByTestId('AgentAssetCard-typeBadge')).toHaveTextContent(
      'Persona',
    );
    expect(
      component.getByTestId('AgentAssetCard-sourceBadge'),
    ).toHaveTextContent('on disk');
    expect(component.getByTestId('AgentAssetCard-filePath')).toHaveTextContent(
      '.agents/personas/architect.md',
    );
    // Disk rows carry no embedding, so there is no relevance score to show.
    expect(component.queryByTestId('AgentAssetCard-similarity')).toBeNull();
    expect(component.getByTestId('AgentAssetCard-link')).toHaveAttribute(
      'href',
      '/personas',
    );
  });
});
