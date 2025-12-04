import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatMessageDto, GroqMessageDto } from './dto/chat.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiBody({ type: ChatMessageDto })
  async classifyIntent(@Body() chatMessageDto: GroqMessageDto) {
    return this.aiService.classifyIntent(chatMessageDto);
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiBody({ type: ChatMessageDto })
  async chat(@Body() chatMessageDto: ChatMessageDto) {
    return this.aiService.chat(chatMessageDto);
  }
}
