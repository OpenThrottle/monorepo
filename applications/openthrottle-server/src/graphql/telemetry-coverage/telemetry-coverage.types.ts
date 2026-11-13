export interface BuildMachineCoverageOptions {
  readonly currentPluginVersion: string | null;
  readonly now: Date;
  readonly windowDays: number;
}
