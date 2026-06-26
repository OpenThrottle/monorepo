import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { CompileMarkdownOptions } from '../compileMarkdown';
import { compileMarkdown, compileMarkdownSync } from '../compileMarkdown';

describe('compileMarkdown', () => {
  test('compiles markdown source into a renderable component', async () => {
    const options: CompileMarkdownOptions = { source: '# Title\n\nBody text.' };

    const Content = await compileMarkdown(options);
    const component = render(<Content />);

    expect(component.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Title',
    );
    expect(component.getByText('Body text.')).toBeInTheDocument();
  });

  test('treats braces, angle brackets and code fences as literal markdown', async () => {
    const options: CompileMarkdownOptions = {
      source: [
        'Use `${GITHUB_TOKEN}` and `<name>` placeholders.',
        '',
        '```bash',
        'pnpm nx g @tools/generators:react --name=<Name>',
        '```',
      ].join('\n'),
    };

    const Content = await compileMarkdown(options);
    const component = render(<Content />);

    expect(component.getByText('${GITHUB_TOKEN}')).toBeInTheDocument();
    expect(
      component.getByText('pnpm nx g @tools/generators:react --name=<Name>'),
    ).toBeInTheDocument();
  });

  test('renders GitHub-flavored markdown tables via remark-gfm', async () => {
    const options: CompileMarkdownOptions = {
      source: '| A | B |\n| - | - |\n| 1 | 2 |',
    };

    const Content = await compileMarkdown(options);
    const component = render(<Content />);

    expect(component.getByRole('table')).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'A' }),
    ).toBeInTheDocument();
  });

  // Regression guard for the security boundary documented on EVALUATE_OPTIONS:
  // raw HTML in source must never reach the rendered output as live markup.
  // With `format: 'md'` the HTML tags are stripped entirely; if this fails, a
  // config change (format: 'mdx' / rehype-raw without rehype-sanitize) has
  // opened an XSS sink.
  test('never emits raw HTML from source as live markup', async () => {
    const options: CompileMarkdownOptions = {
      source:
        'Hello <script>alert(1)</script> and <img src=x onerror=alert(1)>.',
    };

    const Content = await compileMarkdown(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<img');
  });

  // Regression guard for stored XSS via link/image URLs. `mdast-util-to-hast`
  // only URL-encodes link/image targets (via `normalizeUri`) and does NOT drop
  // dangerous schemes, so `[x](javascript:...)` / `![x](data:...)` would reach
  // the DOM as live `href`/`src` sinks. `rehypeSanitizeUrls` must strip them.
  test('strips javascript: hrefs from markdown links', async () => {
    const options: CompileMarkdownOptions = {
      source: '[click](javascript:alert(document.cookie))',
    };

    const Content = await compileMarkdown(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html).not.toContain('javascript:');
    expect(html).not.toMatch(/href=/);
  });

  test('strips data: src from markdown images', async () => {
    const options: CompileMarkdownOptions = {
      source: '![x](data:text/html,<script>alert(1)</script>)',
    };

    const Content = await compileMarkdown(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html).not.toContain('data:');
    expect(html).not.toMatch(/src=/);
  });

  test('neutralizes mixed-case and vbscript: scheme links', async () => {
    const options: CompileMarkdownOptions = {
      source: ['[a](JavaScript:alert(1))', '[b](VBScript:msgbox(1))'].join(
        '\n\n',
      ),
    };

    const Content = await compileMarkdown(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html.toLowerCase()).not.toContain('javascript:');
    expect(html.toLowerCase()).not.toContain('vbscript:');
    expect(html).not.toMatch(/href=/);
  });

  test('preserves safe http(s)/mailto links and relative/fragment hrefs', async () => {
    const options: CompileMarkdownOptions = {
      source: [
        '[ext](https://example.com/page)',
        '[mail](mailto:dev@example.com)',
        '[rel](/docs/intro)',
        '[frag](#section)',
      ].join('\n\n'),
    };

    const Content = await compileMarkdown(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html).toContain('href="https://example.com/page"');
    expect(html).toContain('href="mailto:dev@example.com"');
    expect(html).toContain('href="/docs/intro"');
    expect(html).toContain('href="#section"');
  });

  // External links from untrusted markdown must open in a new tab and carry
  // `rel="noopener noreferrer nofollow"` (reverse tabnabbing + SEO/abuse).
  test('hardens external links with target and rel attributes', async () => {
    const options: CompileMarkdownOptions = {
      source: '[ext](https://example.com/page)',
    };

    const Content = await compileMarkdown(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('href="https://example.com/page"');
  });

  test('does not add target/rel to relative, fragment, or mailto links', async () => {
    const options: CompileMarkdownOptions = {
      source: [
        '[rel](/docs/intro)',
        '[frag](#section)',
        '[mail](mailto:dev@example.com)',
      ].join('\n\n'),
    };

    const Content = await compileMarkdown(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain('rel=');
  });

  test('does not leave target/rel on a stripped unsafe-scheme link', async () => {
    const options: CompileMarkdownOptions = {
      source: '[x](javascript:alert(1))',
    };

    const Content = await compileMarkdown(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html).not.toMatch(/href=/);
    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain('rel=');
  });
});

// `compileMarkdownSync` is the path actually exercised by `MarkdownRenderer`
// (it compiles during render so the output lands in server-rendered HTML). It
// must carry the SAME security guarantees as the async variant — they share
// `EVALUATE_OPTIONS` — so these mirror the async cases above to lock the sync
// path in independently.
describe('compileMarkdownSync', () => {
  test('compiles markdown source into a renderable component', () => {
    const options: CompileMarkdownOptions = { source: '# Title\n\nBody text.' };

    const Content = compileMarkdownSync(options);
    const component = render(<Content />);

    expect(component.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Title',
    );
    expect(component.getByText('Body text.')).toBeInTheDocument();
  });

  test('renders GitHub-flavored markdown tables via remark-gfm', () => {
    const options: CompileMarkdownOptions = {
      source: '| A | B |\n| - | - |\n| 1 | 2 |',
    };

    const Content = compileMarkdownSync(options);
    const component = render(<Content />);

    expect(component.getByRole('table')).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'A' }),
    ).toBeInTheDocument();
  });

  test('never emits raw HTML from source as live markup', () => {
    const options: CompileMarkdownOptions = {
      source:
        'Hello <script>alert(1)</script> and <img src=x onerror=alert(1)>.',
    };

    const Content = compileMarkdownSync(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('<img');
  });

  test('strips javascript: hrefs from markdown links', () => {
    const options: CompileMarkdownOptions = {
      source: '[click](javascript:alert(document.cookie))',
    };

    const Content = compileMarkdownSync(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html).not.toContain('javascript:');
    expect(html).not.toMatch(/href=/);
  });

  test('strips data: src from markdown images', () => {
    const options: CompileMarkdownOptions = {
      source: '![x](data:text/html,<script>alert(1)</script>)',
    };

    const Content = compileMarkdownSync(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html).not.toContain('data:');
    expect(html).not.toMatch(/src=/);
  });

  test('hardens external links with target and rel attributes', () => {
    const options: CompileMarkdownOptions = {
      source: '[ext](https://example.com/page)',
    };

    const Content = compileMarkdownSync(options);
    const html = renderToStaticMarkup(<Content />);

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('href="https://example.com/page"');
  });
});
