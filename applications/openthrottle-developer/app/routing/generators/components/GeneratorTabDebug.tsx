import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Separator,
  TabsContent,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import { type GeneratorDetailCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import {
  buildGeneratorSupportBundle,
  clearGeneratorLastRun,
  readGeneratorLastRun,
  writeGeneratorLastRun,
} from '~/routing/generators/utils/generator-last-run-storage';

export interface GeneratorTabDebugProps {
  className?: string;
  generator: GeneratorDetailCardFragment;
}

export const GeneratorTabDebug = (
  props: GeneratorTabDebugProps,
): React.ReactElement => {
  const { generator } = props;

  // Hooks
  const [cliOutput, setCliOutput] = React.useState('');
  const [mounted, setMounted] = React.useState(false);

  const supportBundle = React.useMemo(
    () => buildGeneratorSupportBundle(generator.name, cliOutput),
    [cliOutput, generator.name],
  );

  // Setup

  // Handlers
  const persistOutput = (next: string): void => {
    setCliOutput(next);
    writeGeneratorLastRun(generator.name, next);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setMounted(true);
    setCliOutput(readGeneratorLastRun(generator.name));
  }, [generator.name]);

  // 🔌 Short Circuit

  return (
    <TabsContent value="debug">
      <Card>
        <CardHeader>
          {/* <CardTitle>Last CLI output (support)</CardTitle> */}
          <CardDescription>
            Paste stdout/stderr from your last{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">nx g</code>{' '}
            run. Stored only in this browser for triage and copy into support
            bundles.
            {!mounted ? ' Loading saved output…' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TextArea
            className="min-h-[160px] font-mono text-xs"
            onChange={(event) => {
              persistOutput(event.target.value);
            }}
            placeholder="Paste terminal output after running a generator command…"
            spellCheck={false}
            value={cliOutput}
          />
          <div className="flex flex-wrap gap-2">
            <OpenThrottleClipboard
              label="Copy support bundle"
              text={supportBundle}
            />
            <Button
              onClick={() => {
                persistOutput('');
                clearGeneratorLastRun(generator.name);
              }}
              type="button"
              variant="outline"
            >
              Clear saved output
            </Button>
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Support bundle includes generator name, ISO timestamp, and pasted
            output.
          </p>
        </CardContent>
      </Card>
    </TabsContent>
  );
};
