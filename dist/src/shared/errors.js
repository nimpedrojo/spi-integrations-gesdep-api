export class AppError extends Error {
    constructor(message, statusCode = 500, context) {
        super(message);
        this.statusCode = statusCode;
        this.context = context;
        this.name = this.constructor.name;
    }
}
export class ValidationError extends AppError {
    constructor(message, context) {
        super(message, 400, context);
    }
}
export class AuthError extends AppError {
    constructor(message = 'Authentication failed', context) {
        super(message, 401, context);
    }
}
export class ExternalServiceError extends AppError {
    constructor(message, context) {
        super(message, 502, context);
    }
}
