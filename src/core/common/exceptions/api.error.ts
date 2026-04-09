export class APIError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusName: 'BAD_REQUEST'|'UNAUTHORIZED'|'FORBIDDEN'|'NOT_FOUND'|'CONFLICT'|'INTERNAL_SERVER', message: string, isOperational = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    switch(statusName) {
      case 'BAD_REQUEST': this.statusCode = 400; break;
      case 'UNAUTHORIZED': this.statusCode = 401; break;
      case 'FORBIDDEN': this.statusCode = 403; break;
      case 'NOT_FOUND': this.statusCode = 404; break;
      case 'CONFLICT': this.statusCode = 409; break;
      case 'INTERNAL_SERVER': this.statusCode = 500; break;
      default: this.statusCode = 500;
    }

    this.isOperational = isOperational;
    Error.captureStackTrace(this);
  }
}

// Global Filter (To be injected in server.ts)
export const globalErrorFilter = (err: any, req: any, res: any, next: any) => {
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }
  // Fallback shielding raw stack-traces natively catching Zod schema failures
  console.error('[Unhandled Global Exception]', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
};
