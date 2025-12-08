import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiBadRequestResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatRequestDto, TextGenerationDto } from './dto/chat.dto';
import {
  FreeformRecommendationDto,
  SimilarProductsDto,
} from './dto/recommendation.dto';
import { RecommendationResponseDto } from './dto/recommendation-response.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { SimilarProductsResponseDto } from './dto/similar-products-response.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

/**
 * AI Controller
 * 
 * Handles HTTP requests for AI-powered features.
 * Provides endpoints for chat interactions, text generation, and intelligent recommendations.
 * 
 * All endpoints require authentication and use the Groq SDK for AI processing.
 */
@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Chat with the AI assistant.
   * 
   * Sends a conversation to the AI and receives a response.
   * Supports multi-turn conversations with message history.
   * 
   * @param chatRequest - Chat request containing message history
   * @returns AI chat response
   */
  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Chat with AI assistant',
    description: 'Engages in a conversation with the AI assistant. Supports multi-turn conversations with message history. Uses Groq SDK for AI processing. Requires JWT authentication via Bearer token.'
  })
  @ApiBody({ 
    type: ChatRequestDto,
    description: 'Chat request containing an array of messages with role and content',
    examples: {
      singleMessage: {
        value: {
          messages: [
            { role: 'user', content: 'Hello! How can you help me?' }
          ]
        }
      },
      multiTurn: {
        value: {
          messages: [
            { role: 'user', content: 'What are your features?' },
            { role: 'assistant', content: 'I can help with product recommendations, store suggestions, and more!' },
            { role: 'user', content: 'Tell me more about product recommendations' }
          ]
        }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Returns AI chat response with role and content',
    type: ChatResponseDto
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing JWT Bearer token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid request - Malformed request body or validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Validation failed' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Internal server error - Groq API error or service failure',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Groq API error: ...' }
      }
    }
  })
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    return this.aiService.chat(chatRequest.messages);
  }

  /**
   * Generates text using AI.
   * 
   * Takes a prompt and generates text based on it.
   * Useful for content generation, summaries, descriptions, etc.
   * 
   * @param request - Text generation request containing prompt
   * @returns Generated text response
   */
  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Generate text using AI',
    description: 'Generates text based on a provided prompt. Uses Groq SDK for AI processing. Useful for content generation, summaries, descriptions, etc. Requires JWT authentication via Bearer token.'
  })
  @ApiBody({ 
    type: TextGenerationDto,
    description: 'Text generation request with a prompt',
    examples: {
      haiku: {
        value: {
          prompt: 'Write a haiku about the sea'
        }
      },
      summary: {
        value: {
          prompt: 'Summarize the benefits of renewable energy in 3 sentences'
        }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Returns generated text response with role and content',
    type: ChatResponseDto
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing JWT Bearer token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid request - Missing or invalid prompt',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Validation failed' },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Internal server error - Groq API error or service failure',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Groq API error: ...' }
      }
    }
  })
  async generateText(@Body() request: TextGenerationDto): Promise<ChatResponseDto> {
    return this.aiService.generateText(request.prompt);
  }

  /**
   * Gets intelligent recommendations based on a natural language query.
   * 
   * Uses Groq's local tool calling to search for products, stores, or promotions
   * based on the user's query. Automatically determines intent and returns
   * structured recommendations with AI-generated explanation text.
   * 
   * @param request - Recommendation request containing query and optional location
   * @returns Structured recommendations with AI text and data
   */
  @Post('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get AI-powered recommendations using tool calling',
    description: 'Provides intelligent recommendations based on a natural language query using Groq\'s local tool calling pattern. Automatically classifies intent (product, store, or promotion) and uses appropriate search tools to find relevant results. Returns structured data with AI-generated recommendation text. Supports location-based distance calculation when latitude/longitude are provided. Requires JWT authentication via Bearer token.'
  })
  @ApiBody({ 
    type: FreeformRecommendationDto,
    description: 'Recommendation request with natural language query and optional parameters',
    examples: {
      productQuery: {
        value: {
          query: 'budget mechanical keyboard',
          count: 5
        }
      },
      storeQuery: {
        value: {
          query: 'electronics stores near me',
          count: 3,
          latitude: 10.3157,
          longitude: 123.8854
        }
      },
      promotionQuery: {
        value: {
          query: 'discounts on smartphones',
          count: 10
        }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Returns structured recommendations with AI-generated text, intent classification, and relevant data (products, stores, or promotions)',
    type: RecommendationResponseDto
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing JWT Bearer token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid request - Missing query, invalid parameters, or tool call error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Tool call error: Invalid JSON in tool arguments' }
      }
    }
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Internal server error - Groq API error, tool execution failure, or max iterations reached',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Tool execution failed for \'search_products\': ...' }
      }
    }
  })
  async getRecommendations(@Body() request: FreeformRecommendationDto): Promise<RecommendationResponseDto> {
    return this.aiService.getRecommendationsFromQuery(
      request.query,
      request.count,
      request.latitude,
      request.longitude,
    );
  }

  /**
   * Gets similar products to a given product.
   * 
   * Uses AI to analyze products and recommend similar items based on
   * features, price range, and characteristics.
   * 
   * @param request - Similar products request containing product ID and count
   * @returns AI-generated recommendation text for similar products
   */
  @Post('similar-products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get similar products recommendations',
    description: 'Uses AI to find and recommend products similar to a given product. Analyzes features, price range, and characteristics to suggest alternatives. Returns AI-generated recommendation text explaining similarities and differences. Requires JWT authentication via Bearer token.'
  })
  @ApiBody({ 
    type: SimilarProductsDto,
    description: 'Similar products request with product ID and optional count',
    examples: {
      default: {
        value: {
          productId: 42,
          count: 5
        }
      },
      moreResults: {
        value: {
          productId: 15,
          count: 10
        }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Returns AI-generated recommendation text for similar products',
    type: SimilarProductsResponseDto
  })
  @ApiUnauthorizedResponse({ 
    description: 'Unauthorized - Invalid or missing JWT Bearer token',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid request - Missing productId, invalid product ID, or product not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Product not found' }
      }
    }
  })
  @ApiInternalServerErrorResponse({ 
    description: 'Internal server error - Groq API error or service failure',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Groq API error: ...' }
      }
    }
  })
  async getSimilarProducts(@Body() request: SimilarProductsDto): Promise<SimilarProductsResponseDto> {
    return this.aiService.getSimilarProducts(request.productId, request.count);
  }
}
