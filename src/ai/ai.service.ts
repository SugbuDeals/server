import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk';

@Injectable()
export class AiService implements OnModuleInit {
  private groq: Groq;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }
    this.groq = new Groq({ apiKey });
  }

  async getModelName(): Promise<string> {
    return this.configService.get<string>('GROQ_MODEL_NAME') || 'llama2-70b-4096';
  }

  async chat(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>) {
    const completion = await this.groq.chat.completions.create({
      messages,
      model: await this.getModelName(),
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      stream: false,
    });

    return completion.choices[0]?.message;
  }

  async generateText(prompt: string) {
    return this.chat([{ role: 'user', content: prompt }]);
  }
}