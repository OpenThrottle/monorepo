import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SearchDocumentationCard } from '../SearchDocumentationCard';
import type { SearchDocumentationCardProps } from '../SearchDocumentationCard';
import type { SearchChunk } from '~/__generated__/graphql';

function mockSearchChunk(overrides: Partial<SearchChunk> = {}): SearchChunk {
  return {
    __typename: 'SearchChunk',
    content: 'Documentation chunk content',
    id: 'chunk-doc-1',
    planId: null,
    planTitle: null,
    similarity: 0.82,
    source: 'documentation',
    sourcePath: null,
    sourceRepo: null,
    sourceSha: null,
    taskId: null,
    taskTitle: null,
    ...overrides,
  };
}

describe('SearchDocumentationCard Component', () => {
  let component: RenderResult;
  let props: SearchDocumentationCardProps;

  beforeEach(() => {
    props = {
      result: mockSearchChunk(),
    };

    const Component = () => <SearchDocumentationCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(
      component.getByTestId('SearchDocumentationCard'),
    ).toBeInTheDocument();
  });

  test('should show source badge', () => {
    props.result = mockSearchChunk({ source: 'documentation' });
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <SearchDocumentationCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(
      component.getByTestId('SearchDocumentationCard-sourceBadge'),
    ).toHaveTextContent('documentation');
  });

  test('should show content and relevance', () => {
    props.result = mockSearchChunk({
      content: 'Specific doc content',
      similarity: 0.91,
    });
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <SearchDocumentationCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(component.getByText('Specific doc content')).toBeInTheDocument();
    expect(
      component.getByTestId('SearchDocumentationCard-similarity'),
    ).toHaveTextContent('Relevance: 91%');
  });

  describe('when result has sourceRepo and sourcePath', () => {
    beforeEach(() => {
      props.result = mockSearchChunk({
        sourcePath: 'docs/AGENT_USAGE.md',
        sourceRepo: 'owner/monorepo',
        sourceSha: null,
      });
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <SearchDocumentationCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component.rerender(<RoutesStub />);
    });

    test('should show GitHub blob link with main when sourceSha is null', () => {
      const link = component.getByTestId('SearchDocumentationCard-blobLink');

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/owner/monorepo/blob/main/docs/AGENT_USAGE.md',
      );
      expect(link).toHaveTextContent('owner/monorepo/docs/AGENT_USAGE.md');
    });
  });

  describe('when result has sourceRepo, sourcePath, and sourceSha', () => {
    beforeEach(() => {
      props.result = mockSearchChunk({
        sourcePath: 'docs/readme.md',
        sourceRepo: 'org/repo',
        sourceSha: 'abc123',
      });
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <SearchDocumentationCard {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component.rerender(<RoutesStub />);
    });

    test('should show GitHub blob link with sha', () => {
      const link = component.getByTestId('SearchDocumentationCard-blobLink');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/org/repo/blob/abc123/docs/readme.md',
      );
    });
  });

  test('should not show blob link when sourceRepo or sourcePath is missing', () => {
    props.result = mockSearchChunk({
      sourcePath: null,
      sourceRepo: null,
      sourceSha: null,
    });
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <SearchDocumentationCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(
      component.queryByTestId('SearchDocumentationCard-blobLink'),
    ).not.toBeInTheDocument();
  });
});
