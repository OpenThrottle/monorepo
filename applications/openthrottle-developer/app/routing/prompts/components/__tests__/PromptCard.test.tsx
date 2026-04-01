import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PromptCard } from '../PromptCard';
import type { PromptCardProps } from '../PromptCard';
import { CustomPromptType } from '~/__generated__/graphql';

const createMockPrompt = (
  overrides?: Partial<PromptCardProps['prompt']>,
): PromptCardProps['prompt'] => ({
  __typename: 'CustomPromptObject',
  content: '# Test Content\n\nThis is test content.',
  createdAt: '2024-01-15T10:00:00Z',
  description: 'A test prompt description',
  filePath: '/path/to/prompt.md',
  id: 'test-prompt-id',
  labels: ['test', 'example'],
  promptType: CustomPromptType.Agents,
  title: 'Test Prompt',
  updatedAt: '2024-01-20T15:30:00Z',
  ...overrides,
});

describe('PromptCard Component', () => {
  let component: RenderResult;
  let props: PromptCardProps;

  beforeEach(() => {
    props = {
      prompt: createMockPrompt(),
    };

    const Component = () => <PromptCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should have data-testid PromptCard', () => {
    expect(component.getByTestId('PromptCard')).toBeInTheDocument();
  });

  test('should display prompt title', () => {
    expect(component.getByText('Test Prompt')).toBeInTheDocument();
  });

  test('should display prompt type badge', () => {
    expect(component.getByText('Agents')).toBeInTheDocument();
  });

  test('should display prompt description', () => {
    expect(
      component.getByText('A test prompt description'),
    ).toBeInTheDocument();
  });

  test('should display labels', () => {
    expect(component.getByText('test')).toBeInTheDocument();
    expect(component.getByText('example')).toBeInTheDocument();
  });

  test('should link to prompt detail page', () => {
    const link = component.getByRole('link');
    expect(link).toHaveAttribute('href', '/prompts/test-prompt-id');
  });

  describe('when prompt has no description', () => {
    beforeEach(() => {
      cleanup();
      props = {
        prompt: createMockPrompt({ description: null }),
      };

      const Component = () => <PromptCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('should not display description paragraph', () => {
      expect(
        component.queryByText('A test prompt description'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when prompt has no labels', () => {
    beforeEach(() => {
      cleanup();
      props = {
        prompt: createMockPrompt({ labels: [] }),
      };

      const Component = () => <PromptCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('should not display labels section', () => {
      expect(component.queryByText('test')).not.toBeInTheDocument();
    });
  });

  describe('when prompt has more than 3 labels', () => {
    beforeEach(() => {
      cleanup();
      props = {
        prompt: createMockPrompt({
          labels: ['one', 'two', 'three', 'four', 'five'],
        }),
      };

      const Component = () => <PromptCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('should show first 3 labels and +N badge', () => {
      expect(component.getByText('one')).toBeInTheDocument();
      expect(component.getByText('two')).toBeInTheDocument();
      expect(component.getByText('three')).toBeInTheDocument();
      expect(component.getByText('+2')).toBeInTheDocument();
      expect(component.queryByText('four')).not.toBeInTheDocument();
    });
  });

  describe('when prompt has no file path', () => {
    beforeEach(() => {
      cleanup();
      props = {
        prompt: createMockPrompt({ filePath: null }),
      };

      const Component = () => <PromptCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

      component = render(<RoutesStub />);
    });

    test('should not display file path', () => {
      expect(component.queryByText('prompt.md')).not.toBeInTheDocument();
    });
  });
});
