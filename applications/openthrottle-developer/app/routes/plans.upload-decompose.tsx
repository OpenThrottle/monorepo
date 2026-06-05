import * as React from 'react';
import { FileUpIcon } from 'lucide-react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import { useFetcher } from 'react-router';
import { PlanCreateMcpParityShell } from '~/routing/plans/components/PlanCreateMcpParityShell';
import { DocumentDecomposePreview } from '~/routing/plans/components/DocumentDecomposePreview';
import { DocumentUploadProgress } from '~/routing/plans/components/DocumentUploadProgress';
import { SITE_TITLE } from '~/global/config/settings';
import type {
  DocumentDecomposeActionData,
  ProposedPlanDecomposition,
} from '~/routing/plans/types/document-decompose';
import type { Route } from '@/app/routes/+types/plans.upload-decompose';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const ACCEPT_EXTENSIONS =
  '.csv,.htm,.html,.json,.md,.markdown,.xls,.xlsx,text/csv,text/html,text/markdown';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Upload document',
  links: (_match) => [{ children: 'Plans', to: '/plans' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Upload document | ${SITE_TITLE}` }];
});

const buildStubProposal = (file: File): ProposedPlanDecomposition => {
  return {
    planDescription: `Stub preview for «${file.name}» (${String(file.size)} bytes). The ingest API will replace this output.`,
    planTitle: `Imported: ${file.name}`,
    tasks: [
      {
        requirements: [
          'Confirm each task matches sections in the source file.',
          'Adjust titles before creating the plan in Cortex.',
        ],
        title: 'Review imported tasks',
      },
      {
        requirements: [
          'Ensure requirement bullets map correctly from the document.',
        ],
        title: 'Validate requirements',
      },
    ],
  };
};

export const action = async (
  args: Route.ActionArgs,
): Promise<DocumentDecomposeActionData> => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'parse') {
    const file = formData.get('document');
    if (!(file instanceof File) || file.size === 0) {
      return { error: 'Choose a non-empty file.', proposal: undefined };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return {
        error: `File is too large (max ${String(MAX_UPLOAD_BYTES)} bytes).`,
        proposal: undefined,
      };
    }
    return { error: undefined, proposal: buildStubProposal(file) };
  }

  if (intent === 'commit') {
    const raw = formData.get('proposalJson');
    if (typeof raw !== 'string' || raw.trim() === '') {
      return { error: 'Missing proposal payload.', proposal: undefined };
    }
    try {
      JSON.parse(raw);
    } catch {
      return { error: 'Invalid proposal payload.', proposal: undefined };
    }
    return {
      error:
        'Creating a plan from this preview is not available until the document ingest API is implemented.',
      proposal: undefined,
    };
  }

  return { error: 'Unknown action.', proposal: undefined };
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData: _l, matches: _m, params: _p } = props;

  // Hooks
  const fetcher = useFetcher<typeof action>();
  const [proposal, setProposal] = React.useState<
    ProposedPlanDecomposition | undefined
  >(undefined);

  // Setup
  const isBusy = fetcher.state === 'submitting' || fetcher.state === 'loading';
  const intentRaw = fetcher.formData?.get('intent');
  const busyMessage =
    intentRaw === 'commit'
      ? 'Creating plan from preview…'
      : 'Parsing document…';

  const progressState = isBusy
    ? ({
        kind: 'busy',
        message: busyMessage,
        value: 42,
      } as const)
    : ({ kind: 'idle' } as const);

  const fetcherError =
    fetcher.data !== undefined && fetcher.data.error !== undefined
      ? fetcher.data.error
      : undefined;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const data = fetcher.data;
    if (!data) {
      return;
    }

    if (data.error === undefined && data.proposal !== undefined) {
      setProposal(data.proposal);
    }
  }, [fetcher.data]);

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <PlanCreateMcpParityShell>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={FileUpIcon}
          title="Upload document"
        />
        <p className="mb-6 text-sm text-muted-foreground">
          Upload markdown, CSV, HTML, JSON, or Excel. After parsing (stubbed
          here), review the proposed plan and tasks, then commit once the ingest
          service is wired.
        </p>

        <div className="flex flex-col gap-6">
          <fetcher.Form
            className="flex flex-col gap-4"
            encType="multipart/form-data"
            method="post"
          >
            <input name="intent" type="hidden" value="parse" />
            <div className="space-y-2">
              <Label htmlFor="document-upload">Document</Label>
              <Input
                accept={ACCEPT_EXTENSIONS}
                className="cursor-pointer"
                id="document-upload"
                name="document"
                required={true}
                type="file"
              />
              <p className="text-xs text-muted-foreground">
                Supported for ingestion (when live): MD, XLSX, CSV, HTML, JSON —
                max {String(MAX_UPLOAD_BYTES / (1024 * 1024))} MiB.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={isBusy} type="submit" variant="default">
                Parse document
              </Button>
            </div>
          </fetcher.Form>

          <DocumentUploadProgress state={progressState} />

          {fetcherError !== undefined ? (
            <p className="text-sm text-destructive" role="alert">
              {fetcherError}
            </p>
          ) : null}

          <DocumentDecomposePreview proposal={proposal} />

          {proposal !== undefined ? (
            <fetcher.Form className="flex flex-wrap gap-2" method="post">
              <input name="intent" type="hidden" value="commit" />
              <input
                name="proposalJson"
                type="hidden"
                value={JSON.stringify(proposal)}
              />
              <Button disabled={isBusy} type="submit" variant="secondary">
                Create plan from preview
              </Button>
            </fetcher.Form>
          ) : null}
        </div>
      </PlanCreateMcpParityShell>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
