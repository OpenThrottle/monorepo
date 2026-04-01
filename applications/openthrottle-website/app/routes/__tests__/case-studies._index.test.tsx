import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import Index from '../case-studies._index';

describe('routes/case-studies._index.tsx', () => {
  let component: RenderResult;

  beforeEach(() => {
    // const RoutesStub = createRoutesStub([
    //   {
    //     Component: (props: React.ComponentProps<typeof Index>) => (
    //       <Index {...props} />
    //     ),
    //     path: '/',
    //   },
    // ]);
    // component = render(<RoutesStub initialEntries={['/']} />);

    const RoutesStub = createRoutesStub([
      { Component: (props: any) => <Index {...props} />, path: '/' },
    ]);

    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('renders case studies section', () => {
    expect(component.getByTestId('CaseStudiesSection')).toBeInTheDocument();
  });

  test('renders main Case Studies heading', () => {
    expect(component.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Case Studies',
    );
  });

  test('renders case study list', () => {
    expect(component.getByTestId('CaseStudyList')).toBeInTheDocument();
  });
});
