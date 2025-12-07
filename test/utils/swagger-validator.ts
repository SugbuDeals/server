/**
 * Swagger Response Validator
 * 
 * Helper functions to validate API responses match Swagger/OpenAPI documentation.
 * These validators check that response structures match the expected DTOs.
 */

/**
 * Validates that a response object contains all required properties
 * @param response - The response object to validate
 * @param requiredProperties - Array of property names that must exist
 * @returns true if all properties exist, false otherwise
 */
export function validateResponseProperties(
  response: any,
  requiredProperties: string[],
): boolean {
  if (!response || typeof response !== 'object') {
    return false;
  }

  return requiredProperties.every((prop) => prop in response);
}

/**
 * Validates that a response matches the AuthResponseDto structure
 * @param response - The response object to validate
 * @returns true if response matches AuthResponseDto structure
 */
export function validateAuthResponse(response: any): boolean {
  return (
    validateResponseProperties(response, ['access_token', 'user']) &&
    typeof response.access_token === 'string' &&
    validateUserResponse(response.user)
  );
}

/**
 * Validates that a response matches the UserResponseDto structure
 * @param response - The response object to validate
 * @returns true if response matches UserResponseDto structure
 */
export function validateUserResponse(response: any): boolean {
  return (
    validateResponseProperties(response, [
      'id',
      'email',
      'name',
      'createdAt',
      'role',
    ]) &&
    typeof response.id === 'number' &&
    typeof response.email === 'string' &&
    typeof response.name === 'string' &&
    (response.createdAt instanceof Date || typeof response.createdAt === 'string') &&
    ['CONSUMER', 'RETAILER', 'ADMIN'].includes(response.role)
  );
}

/**
 * Validates that an error response has the expected structure
 * @param response - The error response object to validate
 * @param expectedStatusCode - Expected HTTP status code
 * @param expectedMessage - Optional expected error message
 * @returns true if error response matches expected structure
 */
export function validateErrorResponse(
  response: any,
  expectedStatusCode: number,
  expectedMessage?: string,
): boolean {
  return (
    validateResponseProperties(response, ['statusCode', 'message']) &&
    response.statusCode === expectedStatusCode &&
    (expectedMessage === undefined || response.message === expectedMessage)
  );
}

/**
 * Validates that a response is an array and all items match a validator function
 * @param response - The response array to validate
 * @param itemValidator - Function to validate each item
 * @returns true if all items pass validation
 */
export function validateArrayResponse<T>(
  response: any,
  itemValidator: (item: any) => boolean,
): response is T[] {
  if (!Array.isArray(response)) {
    return false;
  }

  return response.every((item) => itemValidator(item));
}

