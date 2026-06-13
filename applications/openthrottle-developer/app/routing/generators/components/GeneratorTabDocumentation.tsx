import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  TabsContent,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { generators } from '~/routing/generators/data/data.generators';

export interface GeneratorTabDocumentationProps {
  className?: string;
}

export const GeneratorTabDocumentation = (
  _props: GeneratorTabDocumentationProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent value="documentation">
      <Card>
        <CardHeader>
          {/* <GlobalHeading title="documentation" /> */}
          {/* <CardTitle>Monorepo documentation</CardTitle> */}
          <CardDescription>
            Run Nx from your clone of OpenThrottle; links open the canonical
            docs on GitHub.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc space-y-2 pl-5">
            {generators.map((generator) => (
              <li key={generator.to.toString()}>
                <Link
                  className="text-primary underline-offset-4 hover:underline"
                  rel="noreferrer"
                  target="_blank"
                  to={generator.to}
                >
                  {generator.children}
                </Link>
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground">
            Clone path for local reference:{' '}
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
              docs/tools/templates/AGENT_USAGE.md
            </code>
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  );
};
