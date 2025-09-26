import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatRequestDto, TextGenerationDto } from './dto/chat.dto';

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
}