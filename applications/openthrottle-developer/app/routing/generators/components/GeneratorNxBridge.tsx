import * as React from 'react';
import classnames from 'classnames';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import type { GeneratorDetailCardFragment } from '~/__generated__/graphql';
import {
  GENERATOR_DOCS_AGENT_USAGE,
  GENERATOR_DOCS_AGENTS,
  GENERATOR_DOCS_PERSONAL_GENERATORS,
  GENERATOR_DOCS_TOOLS_PACKAGE_README,
} from '~/routing/generators/constants/generator-nx-docs';
import { buildGeneratorNxPresets } from '~/routing/generators/utils/build-generator-nx-presets';
import {
  buildGeneratorSupportBundle,
  clearGeneratorLastRun,
  readGeneratorLastRun,
  writeGeneratorLastRun,
} from '~/routing/generators/utils/generator-last-run-storage';

export interface GeneratorNxBridgeProps {
  readonly className?: string;
  readonly generator: GeneratorDetailCardFragment;
}

export const GeneratorNxBridge = (props: GeneratorNxBridgeProps) => {
  const { className, generator } = props;

  const [cliOutput, setCliOutput] = React.useState('');
  const [mounted, setMounted] = React.useState(false);

  const presets = React.useMemo(
    () => buildGeneratorNxPresets(generator.name),
    [generator.name],
  );

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

  React.useEffect(() => {
    setMounted(true);
    setCliOutput(readGeneratorLastRun(generator.name));
  }, [generator.name]);

  const persistOutput = (next: string): void => {
    setCliOutput(next);
    writeGeneratorLastRun(generator.name, next);
  };

  const supportBundle = React.useMemo(
    () => buildGeneratorSupportBundle(generator.name, cliOutput),
    [cliOutput, generator.name],
  );

  return (
    <div
      className={classnames('space-y-8', className)}
      data-testid="GeneratorNxBridge"
    >
      <Card>
        <CardHeader>
          <CardTitle>Monorepo documentation</CardTitle>
          <CardDescription>
            Run Nx from your clone of OpenThrottle; links open the canonical
            docs on GitHub.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <a
                className="text-primary underline-offset-4 hover:underline"
                href={GENERATOR_DOCS_AGENT_USAGE}
                rel="noreferrer"
                target="_blank"
              >
                Generator usage (docs/tools/templates/AGENT_USAGE.md)
              </a>
            </li>
            <li>
              <a
                className="text-primary underline-offset-4 hover:underline"
                href={GENERATOR_DOCS_AGENTS}
                rel="noreferrer"
                target="_blank"
              >
                AGENTS.md — Nx and workflow conventions
              </a>
            </li>
            <li>
              <a
                className="text-primary underline-offset-4 hover:underline"
                href={GENERATOR_DOCS_PERSONAL_GENERATORS}
                rel="noreferrer"
                target="_blank"
              >
                Generator-first rule (.cursor/rules/personal-generators.mdc)
              </a>
            </li>
            <li>
              <a
                className="text-primary underline-offset-4 hover:underline"
                href={GENERATOR_DOCS_TOOLS_PACKAGE_README}
                rel="noreferrer"
                target="_blank"
              >
                @tools/generators package (tools/generators/README.md)
              </a>
            </li>
          </ul>
          <p className="text-muted-foreground">
            Clone path for local reference:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              docs/tools/templates/AGENT_USAGE.md
            </code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Command presets</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle>Last CLI output (support)</CardTitle>
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
    </div>
  );
};
