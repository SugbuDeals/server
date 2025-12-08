import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiBadRequestResponse, ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatRequestDto } from './dto/chat.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

/**
 * AI Controller
 * 
 * Handles HTTP requests for AI-powered chatbot using Groq SDK.
 * 
 * **Endpoint:**
 * - `POST /ai/chat` - Unified chatbot that handles all AI interactions
 * 
 * The chatbot intelligently handles:
 * - General conversation and questions
 * - Product recommendations (only from verified stores)
 * - Store recommendations (only verified stores)
 * - Promotion recommendations (only from verified stores)
 * - Similar products queries (only from verified stores)
 * 
 * All recommendations automatically exclude products, stores, and promotions from unverified stores.
 * The endpoint requires JWT authentication via Bearer token.
 * 
 * Uses structured tool calling following Groq best practices to automatically detect user intent
 * and provide location-aware recommendations when coordinates are provided.
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
   * Unified Chatbot Endpoint
   * 
   * Intelligent chatbot that handles all AI interactions:
   * - General conversation and questions
   * - Product recommendations (automatically filters to verified stores only)
   * - Store recommendations (automatically filters to verified stores only)
   * - Promotion recommendations (automatically filters to verified stores only)
   * - Similar products queries (automatically filters to verified stores only)
   * 
   * The chatbot automatically detects user intent and uses appropriate tools.
   * When location coordinates are provided, results are filtered within the specified radius
   * and sorted by combined relevance (70%) and distance (30%) scores.
   * 
   * **Important**: All recommendations automatically exclude products, stores, and promotions
   * from unverified stores. This filtering is handled transparently by the chatbot.
   * 
   * @param chatRequest - Chat request with messages and optional location/count parameters
   * @returns AI chat response with optional structured data (products/stores/promotions)
   * @throws {HttpException} If validation fails, tool execution fails, or API errors occur
   */
  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Unified AI Chatbot',
    description: `Unified chatbot endpoint that intelligently handles all AI interactions:
    
**1. General Conversation**: Responds to greetings, questions, and general queries conversationally.

**2. Product Recommendations**: Automatically detects when users ask about products, items, or goods. Uses search_products tool to find relevant products from verified stores only. Results are sorted by combined relevance (70%) and distance (30%) when location is provided.

**3. Store Recommendations**: Automatically detects when users ask about shops, sellers, or places to buy. Uses search_stores tool to find verified stores only. Results are sorted by combined relevance (70%) and distance (30%) when location is provided.

**4. Promotion Recommendations**: Automatically detects when users ask about deals, discounts, sales, or promotions. Uses search_promotions tool to find active promotions from verified stores only. Results are sorted by combined relevance (70%) and distance (30%) when location is provided.

**5. Similar Products**: Automatically detects when users ask for similar products or alternatives. Uses search_similar_products tool to find similar items from verified stores only.

The chatbot uses Groq's local tool calling pattern following best practices. When latitude and longitude are provided, results are filtered within the specified search radius (5, 10, or 15km - defaults to 5km) and sorted by a weighted combination of relevance to query and proximity to user. Requires JWT authentication via Bearer token.`
  })
   @ApiBody({ 
     type: ChatRequestDto,
     description: 'Chat request with message content and optional location parameters for location-aware recommendations.',
     examples: {
       generalChat: {
         summary: 'General Chat Example',
         description: 'Simple conversational query',
         value: {
           content: 'Hello! How can you help me?',
           count: 3
         }
       },
       productRecommendation: {
         summary: 'Product Recommendation',
         description: 'Automatically detects product intent and searches for relevant products from verified stores',
         value: {
           content: 'Find me budget mechanical keyboards',
           count: 5
         }
       },
       locationAwareRecommendation: {
         summary: 'Location-Aware Store Recommendation',
         description: 'Finds nearby verified stores within 10km radius',
         value: {
           content: 'Show me electronics stores near me',
           latitude: 10.3157,
           longitude: 123.8854,
           radius: 10,
           count: 3
         }
       },
       similarProducts: {
         summary: 'Similar Products Query',
         description: 'Automatically detects similar products intent',
         value: {
           content: 'Show me products similar to product 42',
           count: 5
         }
       }
     }
  })
  @ApiOkResponse({ 
    description: 'Returns AI chat response with role, content, optional intent, and optional structured data (products/stores/promotions). All recommendations only include items from verified stores.',
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
    description: 'Invalid request - Malformed request body, validation error, invalid coordinates, or tool call error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Both latitude and longitude must be provided together' }
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
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    return this.aiService.chat(
      chatRequest.content,
      chatRequest.latitude,
      chatRequest.longitude,
      chatRequest.radius,
      chatRequest.count,
    );
  }

}
