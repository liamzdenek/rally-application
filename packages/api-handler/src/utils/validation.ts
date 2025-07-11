import { z } from 'zod';
import { Request } from 'express';
import { validationErrorResponse } from './response.js';

export function validateRequestBody<T>(schema: z.ZodSchema<T>, req: Request) {
  try {
    console.log('Validating request body:', JSON.stringify(req.body));
    
    const result = schema.parse(req.body);
    console.log('Validation successful');
    return { success: true as const, data: result };
  } catch (error) {
    console.log('Validation failed:', error);
    
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        response: validationErrorResponse(
          'Request validation failed',
          error.issues
        ),
      };
    }
    
    return {
      success: false as const,
      response: validationErrorResponse('Invalid request format'),
    };
  }
}

export function validatePathParam(param: string | undefined, paramName: string) {
  if (!param || param.trim() === '') {
    console.log(`Missing path parameter: ${paramName}`);
    return {
      success: false as const,
      response: validationErrorResponse(`Missing required parameter: ${paramName}`),
    };
  }
  
  console.log(`Path parameter ${paramName} validated:`, param);
  return { success: true as const, data: param };
}