import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@openthrottle/react-router-shadcn';

export interface OpenThrottleBreadcrumbsProps {
  className?: string;
}

export const OpenThrottleBreadcrumbs = (
  props: OpenThrottleBreadcrumbsProps,
) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Breadcrumb className={className} data-testid="OpenThrottleBreadcrumbs">
      <BreadcrumbList className="flex gap-2 items-center">
        <BreadcrumbItem>
          <BreadcrumbPage>Projects</BreadcrumbPage>
        </BreadcrumbItem>
        <BreadcrumbSeparator children="/" />
        <BreadcrumbItem>
          <BreadcrumbPage>Projects 2</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};
