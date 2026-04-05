import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/projects.create';
import { ProjectForm } from '~/routing/projects/components/ProjectForm';
import { CreateProjectDocument } from '~/__generated__/graphql';

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

// export const meta = (_args: Route.MetaArgs) => {
//   return [{ title: `ProjectsCreate | ${SITE_TITLE}` }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Create project | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl mb-4 mt-12 text-highlight">Create Project</h1>
        <ProjectForm actionData={actionData} />
      </div>
    </main>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const name = formData.get('name');

  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Project name is required.' };
  }

  const description = formData.get('description');
  const nxProjectName = formData.get('nxProjectName');

  const input = {
    name: name.trim(),
    ...(typeof description === 'string' &&
      description.trim() && { description: description.trim() }),
    ...(typeof nxProjectName === 'string' &&
      nxProjectName.trim() && { nxProjectName: nxProjectName.trim() }),
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      CreateProjectDocument,
      { input },
    );

    if (!result.createProject?.id) {
      return { error: 'Failed to create project.' };
    }

    return redirect(`/projects/${result.createProject.id}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create project.';
    return { error: message };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
