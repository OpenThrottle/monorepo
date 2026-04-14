export const mockOutput = `
[LoggerService] 47631 warn: [workflow-ralph:debug] main: invoking iteration runner {
{"0":"PlansProcessor [planId=775cf1d3-4c24-4e27-a726-4dad6e474a4a, jobId=2]","service":"openthrottle-server","timestamp":"2026-04-09T05:23:17.359Z"}

[LoggerService] 47631 warn: [workflow-ralph:debug] main: iteration start {
  effectivePlanId: '775cf1d3-4c24-4e27-a726-4dad6e474a4a',
  iteration: 2,
  maxIterations: 10,
  mode: 'plan-centric'
}
{"0":"PlansProcessor [planId=775cf1d3-4c24-4e27-a726-4dad6e474a4a, jobId=2]","service":"openthrottle-server","timestamp":"2026-04-09T05:23:17.359Z"}

[LoggerService] 47631 info:  - 📌 Set task 0323797d-9283-4dae-af08-73ad771fc3da to IN_PROGRESS for this iteration.
{"0":"PlansProcessor [planId=775cf1d3-4c24-4e27-a726-4dad6e474a4a, jobId=2]","service":"openthrottle-server","timestamp":"2026-04-09T05:23:17.381Z"}

[LoggerService] 47631 info:
`;
