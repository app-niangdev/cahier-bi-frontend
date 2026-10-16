/**
 * Erreur métier au format de l'API Laravel (ApiException) :
 * { message, code, status, data? }.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code = 'ERROR',
    readonly status = 422,
    readonly data: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorMessage(error: unknown, fallback = 'Une erreur est survenue. Veuillez réessayer.'): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
