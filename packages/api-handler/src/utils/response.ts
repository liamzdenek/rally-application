export interface ApiResponse<T = any> {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}

export interface SuccessResponse<T = any> {
  data: T;
  message?: string;
}

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export function successResponse<T>(data: T, statusCode = 200, message?: string): ApiResponse<SuccessResponse<T>> {
  const response: SuccessResponse<T> = { data };
  if (message) {
    response.message = message;
  }
  
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(response),
  };
}

export function errorResponse(error: string, message: string, statusCode = 400, details?: any): ApiResponse<ErrorResponse> {
  const response: ErrorResponse = { error, message };
  if (details) {
    response.details = details;
  }
  
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(response),
  };
}

export function notFoundResponse(resource: string): ApiResponse<ErrorResponse> {
  return errorResponse(
    'NOT_FOUND',
    `${resource} not found`,
    404
  );
}

export function validationErrorResponse(message: string, details?: any): ApiResponse<ErrorResponse> {
  return errorResponse(
    'VALIDATION_ERROR',
    message,
    400,
    details
  );
}

export function internalErrorResponse(message = 'Internal server error'): ApiResponse<ErrorResponse> {
  return errorResponse(
    'INTERNAL_ERROR',
    message,
    500
  );
}