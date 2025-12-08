import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiBadRequestResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatRequestDto } from './dto/chat.dto';
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
 * Handles HTTP requests for AI-powered features using Groq SDK.
 * 
 * **Endpoints:**
 * - `POST /ai/chat` - Multi-turn chat conversations
 * - `POST /ai/recommendations` - Unified AI agent for Product/Store/Promotion recommendations and General Chat
 * - `POST /ai/similar-products` - Find similar products to a given product
 * 
 * All endpoints require JWT authentication via Bearer token.
 * 
 * The recommendations endpoint implements an intelligent AI agent that:
 * - Automatically detects user intent (Product, Store, Promotion, or Chat)
 * - Uses structured tool calling following Groq best practices
 * - Provides location-aware recommendations considering both relevance and distance
 * - Returns structured responses with AI-generated explanations
 * 
 * @see https://console.groq.com/docs/tool-use/local-tool-calling
 */
@ApiTags('AI')
@Controller('ai')
export class AiController {
  /**
   * Creates an instance of AiController
   * 
   * @param aiService - Injected AI service for handling AI operations
   */
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
   * Unified AI Agent - Recommendations and Chat
   * 
   * Intelligent AI agent endpoint that handles four modes:
   * 1. **Product Recommendations**: Searches for products matching the query
   * 2. **Store Recommendations**: Searches for stores matching the query
   * 3. **Promotion Recommendations**: Searches for active promotions matching the query
   * 4. **General Chat**: Provides conversational responses for non-shopping queries
   * 
   * The agent automatically detects intent from the query, or uses explicit intent if provided.
   * When location coordinates are provided, results are filtered within the specified radius
   * and sorted by combined relevance (70%) and distance (30%) scores.
   * 
   * @param request - Recommendation request with query and optional parameters (location, radius, intent)
   * @returns Structured recommendation response with AI-generated text and relevant data
   * @throws {HttpException} If validation fails, tool execution fails, or API errors occur
   */
  @Post('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'AI Agent - Unified Recommendations and Chat',
    description: `Unified AI agent endpoint that intelligently handles four modes:
    
**1. Product Recommendations**: Automatically detects when users ask about products, items, or goods. Uses search_products tool to find relevant products. Results are sorted by combined relevance (70%) and distance (30%) when location is provided.

**2. Store Recommendations**: Automatically detects when users ask about shops, sellers, or places to buy. Uses search_stores tool to find relevant stores. Results are sorted by combined relevance (70%) and distance (30%) when location is provided.

**3. Promotion Recommendations**: Automatically detects when users ask about deals, discounts, sales, or promotions. Uses search_promotions tool to find active promotions. Results are sorted by combined relevance (70%) and distance (30%) when location is provided.

**4. General Chat**: Automatically detects general questions, greetings, or conversational queries not related to shopping. Provides conversational responses without tool calling.

The AI agent uses Groq's local tool calling pattern following best practices. When latitude and longitude are provided, results are filtered within the specified search radius (5, 10, or 15km - defaults to 5km) and sorted by a weighted combination of relevance to query and proximity to user. Requires JWT authentication via Bearer token.`
  })
  @ApiBody({ 
    type: FreeformRecommendationDto,
    description: 'AI agent request with natural language query. The agent automatically detects intent, or you can specify it explicitly using the intent field.',
    examples: {
      productRecommendation: {
        summary: 'Product Recommendation Example',
        description: 'Automatically detects product intent and searches for relevant products',
        value: {
          query: 'budget mechanical keyboard',
          count: 5
        }
      },
      storeRecommendation: {
        summary: 'Store Recommendation with Location',
        description: 'Automatically detects store intent and finds nearby stores within 10km radius',
        value: {
          query: 'electronics stores near me',
          count: 3,
          latitude: 10.3157,
          longitude: 123.8854,
          radius: 10
        }
      },
      promotionRecommendation: {
        summary: 'Promotion Recommendation Example',
        description: 'Automatically detects promotion intent and searches for active deals',
        value: {
          query: 'discounts on smartphones',
          count: 10
        }
      },
      generalChat: {
        summary: 'General Chat Example',
        description: 'Automatically detects chat intent and provides conversational response',
        value: {
          query: 'Hello! How can you help me?',
          intent: 'chat'
        }
      },
      explicitProductIntent: {
        summary: 'Explicit Product Intent',
        description: 'Forces product recommendation mode even if query is ambiguous',
        value: {
          query: 'show me something good',
          intent: 'product',
          count: 5
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
      request.radius,
      request.intent,
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
