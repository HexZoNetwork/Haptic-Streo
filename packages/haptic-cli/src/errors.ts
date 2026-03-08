export interface HapticCliErrorOptions {
  code: string;
  message: string;
  details?: string[];
  exitCode?: number;
  cause?: unknown;
}

export class HapticCliError extends Error {
  readonly code: string;
  readonly details: string[];
  readonly exitCode: number;
  override readonly cause?: unknown;

  constructor(options: HapticCliErrorOptions) {
    super(options.message);
    this.name = "HapticCliError";
    this.code = options.code;
    this.details = options.details ?? [];
    this.exitCode = options.exitCode ?? 1;
    this.cause = options.cause;
  }
}

export function formatCliError(error: unknown): string {
  const cliError = normalizeCliError(error);
  const lines = [`Error [${cliError.code}] ${cliError.message}`];

  for (const detail of cliError.details) {
    lines.push(`  - ${detail}`);
  }

  for (const cause of flattenCauseChain(cliError.cause)) {
    lines.push(`Caused by: ${cause}`);
  }

  return `${lines.join("\n")}\n`;
}

export function getCliExitCode(error: unknown): number {
  return error instanceof HapticCliError ? error.exitCode : 1;
}

export function normalizeCliError(error: unknown): HapticCliError {
  if (error instanceof HapticCliError) {
    return error;
  }

  if (error instanceof Error) {
    const metadata = extractErrorMetadata(error);
    return new HapticCliError({
      code: metadata.code,
      message: error.message || "Unexpected error",
      details: metadata.details,
      cause: error.cause,
    });
  }

  return new HapticCliError({
    code: "HPTCLI_UNEXPECTED",
    message: String(error),
  });
}

function flattenCauseChain(cause: unknown): string[] {
  const messages: string[] = [];
  let current = cause;

  while (current) {
    if (current instanceof HapticCliError) {
      messages.push(`${current.code}: ${current.message}`);
      current = current.cause;
      continue;
    }

    if (current instanceof Error) {
      const metadata = extractErrorMetadata(current);
      if (metadata.hasExplicitCode) {
        messages.push(`${metadata.code}: ${current.message}`);
      } else {
        messages.push(`${current.name}: ${current.message}`);
      }
      current = current.cause;
      continue;
    }

    messages.push(String(current));
    break;
  }

  return messages;
}

function extractErrorMetadata(error: Error): { code: string; details: string[]; hasExplicitCode: boolean } {
  const candidate = error as Error & { code?: unknown; details?: unknown };
  const candidateCode = candidate.code;
  const hasExplicitCode = typeof candidateCode === "string" && candidateCode.trim() !== "";
  const code = hasExplicitCode ? candidateCode.trim() : "HPTCLI_UNEXPECTED";
  const details = Array.isArray(candidate.details)
    ? candidate.details.filter((item): item is string => typeof item === "string")
    : [];
  return { code, details, hasExplicitCode };
}
