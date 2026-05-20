import * as React from 'react';
import { type GeneratorDetailCardFragment } from '~/__generated__/graphql';
import classnames from 'classnames';
import { readGeneratorLastRun } from '~/routing/generators/utils/generator-last-run-storage';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';

export interface GeneratorNxBridgeProps {
  className?: string;
  generator: GeneratorDetailCardFragment;
}

export const GeneratorNxBridge = (props: GeneratorNxBridgeProps) => {
  const { className, generator } = props;

  // Hooks
  const [_cliOutput, setCliOutput] = React.useState('');
  const [_mounted, setMounted] = React.useState(false);

  const formattedSchema = React.useMemo(() => {
    if (generator.schemaJson == null || generator.schemaJson === '') {
      return null;
    }

    try {
      return JSON.stringify(JSON.parse(generator.schemaJson), null, 2);
    } catch {
      return generator.schemaJson;
    }
  }, [generator.schemaJson]);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setMounted(true);
    setCliOutput(readGeneratorLastRun(generator.name));
  }, [generator.name]);

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('space-y-8', className)}
      data-testid="GeneratorNxBridge"
    >
      {formattedSchema != null ? (
        <Card>
          <CardHeader>
            <CardTitle>Generator schema (JSON)</CardTitle>
            <CardDescription>
              Snapshot from the GraphQL API; use{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                --describe
              </code>{' '}
              locally for the live schema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium hover:bg-muted/50">
                Show schema
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
                  <code>{formattedSchema}</code>
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
