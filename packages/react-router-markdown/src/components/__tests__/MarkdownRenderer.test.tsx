import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { MarkdownRenderer } from '../MarkdownRenderer';
import type { MarkdownRendererProps } from '../MarkdownRenderer';

describe('MarkdownRenderer Component', () => {
  let component: RenderResult;
  let props: MarkdownRendererProps;

  beforeEach(() => {
    props = {};

    const Component = () => <MarkdownRenderer {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('MarkdownRenderer')).toBeInTheDocument();
  });
});
