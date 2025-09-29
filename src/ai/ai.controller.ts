import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatRequestDto, TextGenerationDto } from './dto/chat.dto';
import { FreeformRecommendationDto, SimilarProductsDto } from './dto/recommendation.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiBody({ type: ChatRequestDto })
  async chat(@Body() chatRequest: ChatRequestDto) {
    return this.aiService.chat(chatRequest.messages);
  }

  @Post('generate')
  @ApiBody({ type: TextGenerationDto })
  async generateText(@Body() request: TextGenerationDto) {
    return this.aiService.generateText(request.prompt);
  }

  @Post('recommendations')
  @ApiBody({ type: FreeformRecommendationDto })
  async getRecommendations(@Body() request: FreeformRecommendationDto) {
    return this.aiService.getRecommendationsFromQuery(request.query, request.count);
  }

  // Deprecated: merged into unified /ai/recommendations

  @Post('similar-products')
  @ApiBody({ type: SimilarProductsDto })
  async getSimilarProducts(@Body() request: SimilarProductsDto) {
    return this.aiService.getSimilarProducts(
      request.productId,
      request.count,
    );
  }
}