import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { MOCK_CASE_STUDY_LIST_ITEMS } from '../../data/mock.case-studies';
import { CaseStudyList } from '../CaseStudyList';
import type { CaseStudyListProps } from '../CaseStudyList';

describe('CaseStudyList Component', () => {
  let component: RenderResult;
  let props: CaseStudyListProps;

  beforeEach(() => {
    props = { caseStudies: MOCK_CASE_STUDY_LIST_ITEMS };

    const Component = () => <CaseStudyList {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub initialEntries={['/']} />);
  });

  test('should render', () => {
    expect(component.getByTestId('CaseStudyList')).toBeInTheDocument();
  });

  test('renders a card per case study', () => {
    const cards = component.getAllByTestId('CaseStudyCard');
    expect(cards.length).toBe(MOCK_CASE_STUDY_LIST_ITEMS.length);
  });
});
