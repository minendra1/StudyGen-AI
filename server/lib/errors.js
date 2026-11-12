// server/lib/errors.js
// Centralized error classes and codes.

export const ErrorCode = {
  INVALID_INPUT: 'invalid_input',
  INVALID_AI_RESPONSE: 'invalid_ai_response',
  UPSTREAM_FAILURE: 'upstream_failure',
  TIMEOUT: 'timeout',
  INTERNAL_ERROR: 'internal_error',
};

/**
 * Application-level error that carries an HTTP status code and a short
 * machine-readable code.  Throw this anywhere in route handlers; the
 * global error middleware in index.js will format and send the response.
 */
export class AppError extends Error {
  /**
   * @param {number} statusCode  HTTP status code (422, 500, 502, 504 …)
   * @param {string} code        One of the ErrorCode constants
   * @param {string} message     Human-readable message sent to the client
   */
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

