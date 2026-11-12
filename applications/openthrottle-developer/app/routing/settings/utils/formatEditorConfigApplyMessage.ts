import type { ApplyWorkspaceEditorConfigurationMutation } from '~/__generated__/graphql';

/**
 * @description Summarizes apply-editor-configuration results for the settings UI.
 */
export const formatEditorConfigApplyMessage = (
  data: ApplyWorkspaceEditorConfigurationMutation,
): string => {
  const applications = data.applyWorkspaceEditorConfiguration.applications;

  if (applications.length === 0) {
    return 'No linked repositories to update. Add a repository or enable at least one editor.';
  }

  const fileCount = applications.reduce(
    (total, application) => total + application.filesWritten.length,
    0,
  );
  const warningCount = applications.reduce(
    (total, application) => total + application.warnings.length,
    0,
  );

  const parts = [
    `Updated ${applications.length} editor/repo pairing(s); wrote ${fileCount} file(s).`,
  ];

  if (warningCount > 0) {
    parts.push(
      `${warningCount} warning(s)—see server logs or re-apply after fixing paths.`,
    );
  }

  return parts.join(' ');
};
