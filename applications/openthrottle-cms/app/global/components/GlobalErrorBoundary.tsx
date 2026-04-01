import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button, Markdown } from '@openthrottle/react-router-shadcn';

export interface GlobalErrorBoundaryProps {
  className?: string;
}

/**
 * @link https://remix.run/docs/en/main/route/error-boundary
 */
export const GlobalErrorBoundary = (props: GlobalErrorBoundaryProps) => {
  const { className = 'flex flex-col h-full p-8' } = props;

  // Hooks
  const error = useRouteError();

  // Setup
  const isError = error instanceof Error;
  const isRouteError = isRouteErrorResponse(error);

  // Handlers
  const onClickRefresh = () => {
    window.location.reload();
  };

  // Markup
  const renderActions = () => {
    return (
      <div className="flex flex-1 items-center justify-center gap-4 my-20 w-full">
        <Link className="ui-button secondary base" to="/">
          Back to Home
        </Link>
        <Button onClick={onClickRefresh}>Refresh</Button>
      </div>
    );
  };

  // Life Cycle

  // 🔌 Short Circuits

  // TODO: if (!isAuthenticated) ...

  if (isRouteError) {
    return (
      <div className={className}>
        <h1 className="text-title">
          {error.status} {error.statusText}
        </h1>
        <Markdown className="mt-4" content={error.data} />
        {renderActions()}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={className}>
        <h1 className="text-title text-2xl">Error Message:</h1>
        <p>{error.message}</p>

        <h2 className="text-subtitle my-4">Stack trace:</h2>
        <Markdown content={error.stack} />
        {renderActions()}
      </div>
    );
  }

  return (
    <div className={className}>
      <h1 className="text-xl">Unknown Error</h1>
      <p>
        Sorry we&apos;ve encountered an unknown error. Please try again later.
      </p>
    </div>
  );
};
