import * as React from 'react';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DocHeadingAnchor } from '../DocHeadingAnchor';
import { DocPageToc } from '../DocPageToc';
import { DocPageView } from '../DocPageView';
import type { DocHeading } from '../../utils/docHeadings';
import type { DocEntry } from '../../utils/buildDocsManifest';

const headings: readonly DocHeading[] = [
  { depth: 2, id: 'intro', text: 'Intro' },
  { depth: 3, id: 'setup', text: 'Setup' },
];

let observerCallback: IntersectionObserverCallback | null = null;

class IntersectionObserverStub implements IntersectionObserver {
  public readonly root = null;
  public readonly rootMargin = '';
  public readonly scrollMargin = '';
  public readonly thresholds: readonly number[] = [];

  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }

  public disconnect(): void {}
  public observe(): void {}
  public takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  public unobserve(): void {}
}

const makeEntry = (id: string, top: number): IntersectionObserverEntry => {
  const target = document.getElementById(id) ?? document.createElement('div');
  const rect: DOMRectReadOnly = {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    toJSON: () => ({}),
    top,
    width: 0,
    x: 0,
    y: top,
  };

  return {
    boundingClientRect: rect,
    intersectionRatio: 1,
    intersectionRect: rect,
    isIntersecting: true,
    rootBounds: null,
    target,
    time: 0,
  };
};

describe('DocPageToc', () => {
  beforeEach(() => {
    observerCallback = null;
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderToc = () =>
    render(
      <>
        <h2 id="intro">Intro</h2>
        <h2 id="setup">Setup</h2>
        <DocPageToc headings={headings} />
      </>,
    );

  test('renders an accessible in-page link per heading', () => {
    const component = renderToc();

    expect(
      component.getByRole('navigation', { name: 'On this page' }),
    ).toBeInTheDocument();
    expect(component.getByRole('link', { name: 'Intro' })).toHaveAttribute(
      'href',
      '#intro',
    );
    expect(component.getByRole('link', { name: 'Setup' })).toHaveAttribute(
      'href',
      '#setup',
    );
  });

  test('marks the first heading active, then follows the scroll-spy', () => {
    const component = renderToc();

    expect(component.getByRole('link', { name: 'Intro' })).toHaveAttribute(
      'aria-current',
      'location',
    );

    act(() => {
      observerCallback?.(
        [makeEntry('setup', 5)],
        new IntersectionObserverStub(() => {}),
      );
    });

    expect(component.getByRole('link', { name: 'Setup' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect(component.getByRole('link', { name: 'Intro' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});

describe('DocHeadingAnchor', () => {
  test('copies the heading fragment to the clipboard', async () => {
    // userEvent.setup() installs its own clipboard stub, so override it AFTER.
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const component = render(<DocHeadingAnchor slug="getting-started" />);

    await user.click(
      component.getByRole('button', {
        name: 'Copy link to “getting-started” section',
      }),
    );

    expect(writeText).toHaveBeenCalledWith('#getting-started');
  });
});

const docEntry: DocEntry = {
  content: '# Title\n\n## Setup\n\nBody text.',
  description: null,
  draft: false,
  group: 'General',
  order: 1,
  path: '/docs/example',
  section: 'docs',
  slug: 'example',
  title: 'Title',
};

describe('DocPageView toc gating', () => {
  test('renders the TOC rail and heading ids when toc is on', () => {
    const component = render(<DocPageView entry={docEntry} toc={true} />);

    expect(
      component.getByRole('navigation', { name: 'On this page' }),
    ).toBeInTheDocument();
    expect(component.container.querySelector('#setup')).not.toBeNull();
  });

  test('renders a single column with no heading ids when toc is off', () => {
    const component = render(<DocPageView entry={docEntry} toc={false} />);

    expect(
      component.queryByRole('navigation', { name: 'On this page' }),
    ).not.toBeInTheDocument();
    expect(component.container.querySelector('#setup')).toBeNull();
  });
});
