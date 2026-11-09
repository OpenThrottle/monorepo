export interface KeyedJsonlRelativePathParams {
  /**
   * @description When two logical keys map to the same default path, pass the pair hash (8 hex) so the job file becomes `{jobSegment}~{hash}.ext`.
   */
  readonly collisionJobSuffix?: string;
  readonly extension: '.jsonl' | '.log';
  readonly jobId: string;
  readonly queueName: string;
}
