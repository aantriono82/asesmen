export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  public constructor(message: string, code = "APP_ERROR", statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends AppError {
  public constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  public constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403);
  }
}

export class ValidationAppError extends AppError {
  public constructor(message = "Validation failed") {
    super(message, "VALIDATION_ERROR", 400);
  }
}
