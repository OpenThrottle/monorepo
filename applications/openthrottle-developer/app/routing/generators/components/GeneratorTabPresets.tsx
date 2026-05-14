import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  TabsContent,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { buildGeneratorNxPresets } from '~/routing/generators/utils/build-generator-nx-presets';
import { GeneratorDetailCardFragment } from '~/__generated__/graphql';

export interface GeneratorTabPresetsProps {
  readonly generator: GeneratorDetailCardFragment;
}

export const GeneratorTabPresets = (props: GeneratorTabPresetsProps) => {
  const { generator } = props;

  // Hooks

  // Setup
  const presets = React.useMemo(
    () => buildGeneratorNxPresets(generator.name),
    [generator.name],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent value="presets">
      <Card>
        <CardHeader>
          {/* <GlobalHeading title="Command presets" /> */}
          {/* <CardTitle>Command presets</CardTitle> */}
          <CardDescription>
            Copy commands into your terminal from the repository root. Replace
            list keys or sub-generator names using output from{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              --describe
            </code>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {presets.map((preset) => (
            <div className="space-y-2" key={preset.id}>
              <p className="text-sm font-medium">{preset.description}</p>
              <div className="flex flex-wrap items-start gap-2">
                <pre className="max-w-full flex-1 overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
                  <code>{preset.command}</code>
                </pre>
                <OpenThrottleClipboard
                  label="Copy command"
                  text={preset.command}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </TabsContent>
  );
};
