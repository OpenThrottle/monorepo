import * as React from 'react';
import { Link } from 'react-router';
import classnames from 'classnames';
import type { CaseStudyListItem } from '../types';
import { CaseStudyCard } from './CaseStudyCard';

interface CaseStudyListProps {
  readonly caseStudies: readonly CaseStudyListItem[];
  readonly className?: string;
}

export const CaseStudyList = (props: CaseStudyListProps) => {
  const { caseStudies, className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('grid gap-6 sm:grid-cols-2', className)}
      data-testid="CaseStudyList"
    >
      {caseStudies.map((item) => (
        <Link key={item.id} to={`/case-studies/${item.slug}`}>
          <CaseStudyCard item={item} />
        </Link>
      ))}
    </div>
  );
};
