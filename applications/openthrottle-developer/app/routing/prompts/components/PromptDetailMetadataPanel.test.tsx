import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { CustomPromptType } from '~/__generated__/graphql';
import type { GetPromptQuery } from '~/__generated__/graphql';
import { PromptDetailMetadataPanel } from './PromptDetailMetadataPanel';
import type { PromptDetailMetadataPanelProps } from './PromptDetailMetadataPanel';

const prompt: NonNullable<GetPromptQuery['customPrompt']> = {
  content: '# Test Prompt',
  createdAt: '2026-01-01T00:00:00.000Z',
  description: 'A test prompt',
  filePath: '.cursor/rules/test.mdc',
  id: 'prompt-1',
  labels: ['test'],
  projectId: 'project-1',
  promptType: CustomPromptType.Prompts,
  title: 'Test Prompt',
  updatedAt: '2026-01-02T00:00:00.000Z',
  userId: 'user-1',
};

describe('PromptDetailMetadataPanel Component', () => {
  let component: RenderResult;
  let props: PromptDetailMetadataPanelProps;

  beforeEach(() => {
    props = {
      contentLength: prompt.content.length,
      debugContent: prompt.content,
      prompt,
    };

    component = render(<PromptDetailMetadataPanel {...props} />);
  });

  test('renders the collapsed panel heading', () => {
    expect(
      component.getByText('Prompt versioning & debug'),
    ).toBeInTheDocument();
    expect(component.queryByText('Prompt ID')).toBeNull();
  });

  test('expands to show metadata rows and actions when clicked', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByText('Prompt versioning & debug').closest('button')!,
    );

    expect(component.getByText('Prompt ID')).toBeInTheDocument();
    expect(component.getByText('prompt-1')).toBeInTheDocument();
    expect(component.getByText('Labels')).toBeInTheDocument();
    expect(component.getByText('test')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Copy prompt ID' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /View file on GitHub/ }),
    ).toBeInTheDocument();
  });
});
