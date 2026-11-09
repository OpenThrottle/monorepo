export interface GeneratorItem {
  readonly description: string;
  readonly name: string;
}

export interface GeneratorDetail {
  readonly description: string;
  readonly name: string;
  readonly schema: Record<string, unknown> | null;
}
