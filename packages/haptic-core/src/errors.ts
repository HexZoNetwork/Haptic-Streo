export interface HapticCompilerErrorOptions {
  code: string;
  message: string;
  details?: string[];
  stage?: string;
  cause?: unknown;
}

export class HapticCompilerError extends Error {
  readonly code: string;
  readonly details: string[];
  readonly stage?: string;
  override readonly cause?: unknown;

  constructor(options: HapticCompilerErrorOptions) {
    super(options.message);
    this.name = "HapticCompilerError";
    this.code = options.code;
    this.details = options.details ?? [];
    this.stage = options.stage;
    this.cause = options.cause;
  }
}

export function ensureCompilerError(error: unknown, fallback: HapticCompilerErrorOptions): HapticCompilerError {
  if (error instanceof HapticCompilerError) {
    return error;
  }

  if (error instanceof Error) {
    return new HapticCompilerError({
      ...fallback,
      cause: error,
    });
  }

  return new HapticCompilerError({
    ...fallback,
    cause: error,
  });
}
