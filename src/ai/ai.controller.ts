import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatRequestDto, TextGenerationDto } from './dto/chat.dto';
import { ProductRecommendationDto, SimilarProductsDto } from './dto/recommendation.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() chatRequest: ChatRequestDto) {
    return this.aiService.chat(chatRequest.messages);
  }

  @Post('generate')
  async generateText(@Body() request: TextGenerationDto) {
    return this.aiService.generateText(request.prompt);
  }

  @Post('recommendations')
  async getRecommendations(@Body() request: ProductRecommendationDto) {
    return this.aiService.generateProductRecommendations(
      request.userPreferences,
      request.count,
    );
  }

  @Post('similar-products')
  async getSimilarProducts(@Body() request: SimilarProductsDto) {
    return this.aiService.getSimilarProducts(
      request.productId,
      request.count,
    );
  }
}