import * as React from 'react';
import { GeneratorDetailCardFragment } from '~/__generated__/graphql';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  TabsContent,
} from '@openthrottle/react-router-shadcn';

export interface GeneratorTabSchemaProps {
  generator: GeneratorDetailCardFragment;
}

export const GeneratorTabSchema = (
  props: GeneratorTabSchemaProps,
): React.ReactElement => {
  const { generator } = props;

  // Hooks

  // Setup
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

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent value="schema">
      <Card>
        <CardHeader>
          {/* <CardTitle>Generator schema (JSON)</CardTitle> */}
          <CardDescription>
            Snapshot from the GraphQL API; use{' '}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
              --describe
            </code>{' '}
            locally for the live schema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Collapsible>
            <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm font-medium">
              Show schema
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <pre className="bg-muted max-h-96 overflow-auto rounded-md p-3 text-xs leading-relaxed">
                <code>{formattedSchema}</code>
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </TabsContent>
  );
};
