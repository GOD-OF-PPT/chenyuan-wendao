export class RuleError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'RuleError';
  }
}
export function fail(code: string, message: string): never {
  throw new RuleError(code, message);
}
