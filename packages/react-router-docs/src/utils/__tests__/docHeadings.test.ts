import { describe, expect, test } from 'vitest';
import { extractDocHeadings } from '../docHeadings';

describe('extractDocHeadings', () => {
  test('collects h2/h3 in document order with matching ids', () => {
    const content = [
      '# Page title',
      '',
      '## Getting Started',
      'body',
      '### Prerequisites',
      '## Next steps',
    ].join('\n');

    expect(extractDocHeadings(content)).toEqual([
      { depth: 2, id: 'getting-started', text: 'Getting Started' },
      { depth: 3, id: 'prerequisites', text: 'Prerequisites' },
      { depth: 2, id: 'next-steps', text: 'Next steps' },
    ]);
  });

  test('excludes the h1 page title', () => {
    const headings = extractDocHeadings('# Title\n\n## Section');
    expect(headings.map((h) => h.depth)).toEqual([2]);
  });

  test('ignores headings inside fenced code blocks', () => {
    const content = ['## Real', '', '```md', '## Fake in code', '```'].join(
      '\n',
    );

    expect(extractDocHeadings(content).map((h) => h.text)).toEqual(['Real']);
  });

  test('strips inline Markdown from the label but keeps a plain-text slug', () => {
    const [heading] = extractDocHeadings('## Run `pnpm install`');
    expect(heading.text).toBe('Run pnpm install');
    expect(heading.id).toBe('run-pnpm-install');
  });
});
