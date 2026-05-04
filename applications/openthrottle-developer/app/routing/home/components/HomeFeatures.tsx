import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { HOME_FEATURES } from '~/routing/home/data';

export interface HomeFeaturesProps {
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
      className={classnames('p-4 md:p-8 space-y-8', className)}
      data-testid="HomeFeatures"
    >
      <h2 className="text-center text-xl font-bold tracking-tight">
        OpenThrottle Features
      </h2>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {HOME_FEATURES.map((feature) => (
          <Card className="h-full" key={feature.title}>
            <CardHeader>
              <CardTitle className="text-lg mb-2">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
};
