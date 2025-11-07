export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
