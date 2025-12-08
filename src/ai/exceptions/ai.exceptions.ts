import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for AI service errors
 * 
 * All AI-related exceptions extend this base class to provide
 * consistent error handling throughout the AI module.
 * 
 * @extends HttpException
 */
export class AiServiceException extends HttpException {
  /**
   * Creates a new AI service exception
   * 
   * @param message - Error message describing what went wrong
   * @param statusCode - HTTP status code (default: 500 Internal Server Error)
   */
  constructor(message: string, statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message, statusCode);
    this.name = 'AiServiceException';
  }
}

/**
 * Exception thrown when tool execution fails
 * 
 * This exception is thrown when a tool function encounters an error
 * during execution (e.g., database query fails, validation error).
 * 
 * @extends AiServiceException
 */
export class ToolExecutionException extends AiServiceException {
  /**
   * Creates a new tool execution exception
   * 
   * @param toolName - Name of the tool that failed
   * @param error - Error message or description
   */
  constructor(toolName: string, error: string) {
    super(`Tool execution failed for '${toolName}': ${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
    this.name = 'ToolExecutionException';
  }
}

/**
 * Exception thrown when tool call parsing or validation fails
 * 
 * This exception is thrown when:
 * - Tool call arguments cannot be parsed as JSON
 * - Tool call arguments fail validation
 * - Tool call structure is invalid
 * 
 * @extends AiServiceException
 */
export class ToolCallException extends AiServiceException {
  /**
   * Creates a new tool call exception
   * 
   * @param message - Error message describing the tool call error
   * @param toolName - Optional name of the tool that had the error
   */
  constructor(message: string, toolName?: string) {
    const fullMessage = toolName 
      ? `Tool call error for '${toolName}': ${message}`
      : `Tool call error: ${message}`;
    super(fullMessage, HttpStatus.BAD_REQUEST);
    this.name = 'ToolCallException';
  }
}

/**
 * Exception thrown when maximum iterations are reached
 * 
 * This exception is thrown when the tool calling loop reaches
 * the maximum number of iterations (default: 10) without completing.
 * This prevents infinite loops in tool calling.
 * 
 * @extends AiServiceException
 */
export class MaxIterationsException extends AiServiceException {
  /**
   * Creates a new max iterations exception
   * 
   * @param maxIterations - The maximum number of iterations that were reached
   */
  constructor(maxIterations: number) {
    super(
      `Maximum iterations (${maxIterations}) reached without completing the task. The AI may need more attempts or the query may be too complex.`,
      HttpStatus.REQUEST_TIMEOUT,
    );
    this.name = 'MaxIterationsException';
  }
}

/**
 * Exception thrown when a required tool is not found
 * 
 * This exception is thrown when the Groq API requests a tool that
 * is not in the available tools map. This indicates a configuration
 * mismatch between tool schemas and implementations.
 * 
 * @extends AiServiceException
 */
export class ToolNotFoundException extends AiServiceException {
  /**
   * Creates a new tool not found exception
   * 
   * @param toolName - Name of the tool that was not found
   */
  constructor(toolName: string) {
    super(`Tool '${toolName}' not found in available tools`, HttpStatus.INTERNAL_SERVER_ERROR);
    this.name = 'ToolNotFoundException';
  }
}

/**
 * Exception thrown when Groq API call fails
 * 
 * This exception is thrown when:
 * - Groq API returns an error response
 * - Network error occurs during API call
 * - API rate limits are exceeded
 * - Invalid API key or configuration
 * 
 * @extends AiServiceException
 */
export class GroqApiException extends AiServiceException {
  /**
   * Creates a new Groq API exception
   * 
   * @param message - Error message from Groq API or error description
   * @param statusCode - Optional HTTP status code from Groq API response
   */
  constructor(message: string, statusCode?: number) {
    super(
      `Groq API error: ${message}`,
      statusCode ? (statusCode as HttpStatus) : HttpStatus.INTERNAL_SERVER_ERROR,
    );
    this.name = 'GroqApiException';
  }
}

