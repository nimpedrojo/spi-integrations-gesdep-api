export class AppError extends Error {
  constructor(message: string, public readonly statusCode = 500, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 400, context);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication failed', context?: Record<string, unknown>) {
    super(message, 401, context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 502, context);
  }
}
