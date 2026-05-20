import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { HOME_FEATURES } from '~/routing/home/data';

interface HomeFeaturesProps {
  className?: string;
}

export const HomeFeatures = (props: HomeFeaturesProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={classnames(
        'gap-4 md:gap-8 lg:gap-12',
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        // 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        className,
      )}
      data-testid="HomeFeatures"
    >
      {HOME_FEATURES.map((feature) => (
        <Card className="h-full" key={feature.title}>
          <CardHeader>
            <CardTitle className="text-lg mb-2">{feature.title}</CardTitle>
            <CardDescription>{feature.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </section>
  );
};
