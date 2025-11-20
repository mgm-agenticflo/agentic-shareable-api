export type ErrorDetails = {
  code?: string;
  backendMessage?: string;
};

export class HttpCodedError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown,
    public shouldClose: boolean = false
  ) {
    super(message);
    this.name = 'HttpCodedError';
  }
}
