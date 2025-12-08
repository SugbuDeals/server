import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for AI service errors
 */
export class AiServiceException extends HttpException {
  constructor(message: string, statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message, statusCode);
    this.name = 'AiServiceException';
  }
}

/**
 * Exception thrown when tool execution fails
 */
export class ToolExecutionException extends AiServiceException {
  constructor(toolName: string, error: string) {
    super(`Tool execution failed for '${toolName}': ${error}`, HttpStatus.INTERNAL_SERVER_ERROR);
    this.name = 'ToolExecutionException';
  }
}

/**
 * Exception thrown when tool call parsing or validation fails
 */
export class ToolCallException extends AiServiceException {
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
 */
export class MaxIterationsException extends AiServiceException {
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
 */
export class ToolNotFoundException extends AiServiceException {
  constructor(toolName: string) {
    super(`Tool '${toolName}' not found in available tools`, HttpStatus.INTERNAL_SERVER_ERROR);
    this.name = 'ToolNotFoundException';
  }
}

/**
 * Exception thrown when Groq API call fails
 */
export class GroqApiException extends AiServiceException {
  constructor(message: string, statusCode?: number) {
    super(
      `Groq API error: ${message}`,
      statusCode ? (statusCode as HttpStatus) : HttpStatus.INTERNAL_SERVER_ERROR,
    );
    this.name = 'GroqApiException';
  }
}

