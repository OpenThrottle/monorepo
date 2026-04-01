import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { MOCK_CASE_STUDY_LIST_ITEMS } from '../../data/mock.case-studies';
import { CaseStudyCard } from '../CaseStudyCard';
import type { CaseStudyCardProps } from '../CaseStudyCard';

describe('CaseStudyCard Component', () => {
  let component: RenderResult;
  let props: CaseStudyCardProps;

  beforeEach(() => {
    props = { item: MOCK_CASE_STUDY_LIST_ITEMS[0]! };

    const Component = () => <CaseStudyCard {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('should render', () => {
    expect(component.getByTestId('CaseStudyCard')).toBeInTheDocument();
  });

  test('renders item title and company', () => {
    const item = MOCK_CASE_STUDY_LIST_ITEMS[0]!;
    expect(component.getByText(item.title)).toBeInTheDocument();
    expect(component.getByText(item.company)).toBeInTheDocument();
  });
});
