import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatRequestDto, TextGenerationDto } from './dto/chat.dto';
import {
  FreeformRecommendationDto,
  SimilarProductsDto,
} from './dto/recommendation.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: ChatRequestDto })
  async chat(@Body() chatRequest: ChatRequestDto) {
    return this.aiService.chat(chatRequest.messages);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: TextGenerationDto })
  async generateText(@Body() request: TextGenerationDto) {
    return this.aiService.generateText(request.prompt);
  }

  @Post('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: FreeformRecommendationDto })
  async getRecommendations(@Body() request: FreeformRecommendationDto) {
    return this.aiService.getRecommendationsFromQuery(
      request.query,
      request.count,
      request.latitude,
      request.longitude,
    );
  }
}
