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

const diskRule: AgentAssetResult = {
  content: 'No cursor attribution in commits.',
  customPromptId: null,
  description: null,
  filePath: '.agents/rules/no-cursor-attribution.mdc',
  id: 'disk:rules:.agents/rules/no-cursor-attribution.mdc',
  labels: [],
  promptType: 'rules',
  similarity: null,
  source: 'disk',
  title: 'no-cursor-attribution',
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

  test('renders an on-disk rule with file path and no detail link', () => {
    const component = renderCard(diskRule);

    expect(
      component.getByTestId('AgentAssetCard-sourceBadge'),
    ).toHaveTextContent('on disk');
    expect(component.getByTestId('AgentAssetCard-filePath')).toHaveTextContent(
      '.agents/rules/no-cursor-attribution.mdc',
    );
    expect(component.queryByTestId('AgentAssetCard-link')).toBeNull();
    expect(component.queryByTestId('AgentAssetCard-similarity')).toBeNull();
  });
});
