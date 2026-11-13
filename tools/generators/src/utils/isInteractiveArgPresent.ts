export const isInteractiveArgPresent = (): boolean => {
  return (
    process.argv.includes('--interactive') ||
    process.argv.includes('--interactive=true') ||
    process.argv.includes('--interactive=1')
  );
};
