export const MESSAGE_ON_CANCEL = `\n 👋 Operation canceled, another time maybe 👋\n`;

export const onApplicationSuccess = (name: string) => `
----------------------------------------------------------------------

🚀 Application created 🚀

  Run "nx run ${name}:dev" to start the application.

----------------------------------------------------------------------

🗒️  Next Steps:

1. Create a helm "chart" and "deployment" for the application
2. Add the new application to the our "github-actions.yml" workflow
  - Update the "🔍 Identify Changes" with the new application
  - Create a entry for "🎬 Build: ${name}"
3. Update the monorepo "README.md" file
4. Add to the "docker-compose.yml" workflow and root environment

----------------------------------------------------------------------
`;
