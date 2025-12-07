import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags, ApiBearerAuth, ApiOperation, ApiOkResponse, ApiUnauthorizedResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatRequestDto, TextGenerationDto } from './dto/chat.dto';
import {
  FreeformRecommendationDto,
  SimilarProductsDto,
} from './dto/recommendation.dto';
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
    description: 'Engages in a conversation with the AI assistant. Supports multi-turn conversations with message history. Uses Groq SDK for AI processing.'
  })
  @ApiBody({ type: ChatRequestDto })
  @ApiOkResponse({ 
    description: 'Returns AI chat response',
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', example: 'Hello! How can I help you today?' },
        role: { type: 'string', example: 'assistant' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ 
    description: 'Invalid request or AI service error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string' }
      }
    }
  })
  async chat(@Body() chatRequest: ChatRequestDto) {
    return this.aiService.chat(chatRequest.messages);
  }

  /**
   * Generates text using AI.
   * 
   * Takes a prompt and generates text based on it.
   * Useful for content generation, summaries, descriptions, etc.
   * 
   * @param request - Text generation request containing prompt
   * @returns Generated text
   */
  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Generate text using AI',
    description: 'Generates text based on a provided prompt. Uses Groq SDK for AI processing. Useful for content generation, summaries, descriptions, etc.'
  })
  @ApiBody({ type: TextGenerationDto })
  @ApiOkResponse({ 
    description: 'Returns generated text',
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', example: 'Generated text based on the prompt...' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ 
    description: 'Invalid request or AI service error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 }
      }
    }
  })
  async generateText(@Body() request: TextGenerationDto) {
    return this.aiService.generateText(request.prompt);
  }

  /**
   * Gets intelligent recommendations based on a natural language query.
   * 
   * Analyzes the user's query to determine intent (product, store, or promotion)
   * and returns relevant recommendations. Supports location-based filtering
   * for store recommendations.
   * 
   * @param request - Recommendation request containing query and optional location
   * @returns Recommendations (products, stores, or promotions) based on query
   */
  @Post('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get AI-powered recommendations',
    description: 'Provides intelligent recommendations based on a natural language query. Automatically classifies intent (product, store, or promotion) and returns relevant results. Supports location-based filtering for store recommendations.'
  })
  @ApiBody({ type: FreeformRecommendationDto })
  @ApiOkResponse({ 
    description: 'Returns recommendations based on query',
    schema: {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              description: { type: 'string' }
            }
          }
        },
        intent: { type: 'string', enum: ['product', 'store', 'promotion'] }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ 
    description: 'Invalid request or AI service error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 }
      }
    }
  })
  async getRecommendations(@Body() request: FreeformRecommendationDto) {
    return this.aiService.getRecommendationsFromQuery(
      request.query,
      request.count,
      request.latitude,
      request.longitude,
    );
  }
}
