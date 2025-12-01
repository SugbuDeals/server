import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiBearerAuth('bearer')
  @ApiBody({ type: ChatRequestDto })
  async chat(@Body() chatRequest: ChatRequestDto) {
    return this.aiService.chat(chatRequest.messages);
  }

  @Post('agent-chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiBody({ type: ChatRequestDto })
  async agentChat(@Body() chatRequest: ChatRequestDto) {
    return this.aiService.agentChat(chatRequest.messages);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiBody({ type: TextGenerationDto })
  async generateText(@Body() request: TextGenerationDto) {
    return this.aiService.generateText(request.prompt);
  }

  @Post('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
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
