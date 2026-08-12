import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ToolPayload } from '../ToolPayload';
import type { ToolPayloadProps } from '../ToolPayload';

const renderPayload = (props: ToolPayloadProps): RenderResult =>
  render(<ToolPayload {...props} />);

describe('ToolPayload', () => {
  test('renders the label', () => {
    const component = renderPayload({
      content: '{"path":"a.ts"}',
      label: 'Arguments',
    });

    expect(component.getByText('Arguments')).toBeInTheDocument();
  });

  test('renders the content', () => {
    const component = renderPayload({
      content: '{"ok":true}',
      label: 'Result',
    });

    expect(component.container.textContent).toContain('{"ok":true}');
  });

  test('renders a different label/content pair', () => {
    const component = renderPayload({
      content: 'plain text result',
      label: 'Result',
    });

    expect(component.getByText('Result')).toBeInTheDocument();
    expect(component.getByText('plain text result')).toBeInTheDocument();
  });
});
