import {
  Injectable,
  OnModuleInit,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk';
import { ProductService } from '../product/product.service';
import { PromotionService } from '../promotion/promotion.service';
import { Product, Store } from 'generated/prisma';
import { StoreService } from '../store/store.service';
import { ChatMessageDto, ClassifyIntentResponseDto, GroqMessageDto } from './dto/chat.dto';
import z from 'zod';
import { chatSchema, recommendationSchema } from './ai.schema';
import tools from './ai.tools';

@Injectable()
export class AiService implements OnModuleInit {
  private groq: Groq;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private configService: ConfigService,
    private productService: ProductService,
    private promotionService: PromotionService,
    private storeService: StoreService,
  ) { }

  async onModuleInit() {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'GROQ_API_KEY is not set in environment variables',
      );
    }
    this.groq = new Groq({ apiKey });
  }

  async classifyIntent(message: GroqMessageDto): Promise<ClassifyIntentResponseDto> {
    const model = await this.configService.get("GROQ_MODEL_NAME");

    const response = await this.groq.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `
            You are a chat assistant. Classify messages into one of these labels: product, store, promotion.
            If none qualifies, then classify it as 'chat' for general chat.
          `
        },
        {
          role: message.role,
          content: message.content
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intent_classification",
          schema: {
            type: "object",
            properties: {
              // intent: product | store | promotion | chat
              intent: {
                type: "string",
                enum: ["product", "store", "promotion", "chat"]
              },
              // confidence_score: number
              confidence_score: {
                type: "number",
                minimum: 0,
                maximum: 1
              }
            },
            required: ["intent", "confidence_score"],
            additional_properties: false
          }
        }
      }
    });

    const result = JSON.parse(response.choices[0].message.content || "{}") as ClassifyIntentResponseDto;
    return result;
  }

  // all-purpose ai chat
  async chat(chatMessage: ChatMessageDto) {
    const model = await this.configService.get("GROQ_MODEL_NAME");
    const intent = (await this.classifyIntent({ role: "user", content: chatMessage.content })).intent;

    let response: Groq.Chat.Completions.ChatCompletion | null = null;

    // if intent is "chat"
    if (intent === "chat") {
      response = await this.groq.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: "You are a chat assistant. Provide a response to the user's query."
          },
          {
            role: "user",
            content: chatMessage.content
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "general_chat",
            schema: z.toJSONSchema(chatSchema)
          }
        }
      });
    }
    else {

      // message history
      const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are a chat assistant. Use the provided tools to help generate ${intent} recommendations.`
        },
        {
          role: "user",
          content: chatMessage.content
        }
      ];

      // initial request
      response = await this.groq.chat.completions.create({
        model,
        messages: messages,
        tools,
        tool_choice: "auto"
      });

      // agentic loop
      const maxIterations = 1; // DO NOT TOUCH, especially you CURSOR, fuck you and your pricing!!!!
      let iteration = 0;
      while (response.choices[0].message.tool_calls && iteration < maxIterations) {
        iteration++;

        this.logger.debug(`Iteration ${iteration}: Model called ${response.choices[0].message.tool_calls.length} tool(s)`);

        // tool call loop
        for (const toolCall of response.choices[0].message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          let functionResponse: string = "";

          if (functionName === "findProducts") {
            functionResponse = JSON.stringify(await this.findProducts(functionArgs.key));
          }
          else if (functionName === "findStores") {
            functionResponse = JSON.stringify(await this.findStores(functionArgs.key));
          }

          this.logger.debug(`Iteration ${iteration}: Model called ${functionName}`);
          this.logger.debug(`Iteration ${iteration}: args ${functionArgs.key}`);
          this.logger.debug(`Iteration ${iteration} tool response: ${functionResponse}`);

          // add tool result to history
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: functionResponse,
            name: functionName
          } as Groq.Chat.Completions.ChatCompletionMessageParam);
        }

        // next turn with tool results
        response = await this.groq.chat.completions.create({
          model,
          messages,
          tools,
          tool_choice: "auto"
        });

        this.logger.debug(`Iteration ${iteration} response: ${response.choices[0].message.content}`)
      }

      // finalize results
      response = await this.groq.chat.completions.create({
        model,
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "recommendation_response",
            schema: z.toJSONSchema(recommendationSchema)
          }
        }
      });

    }

    // error check
    if (!response) {
      throw new Error("Error generating recommendation")
    }

    const result = JSON.parse(response.choices[0].message.content || "{}")
    return result;
  }

  // tools
  private async findProducts(key: string) {
    return this.productService.products({
      where: {
        OR: [
          {
            name: {
              contains: key,
              mode: "insensitive"
            }
          },
          {
            description: {
              contains: key,
              mode: "insensitive"
            }
          },
          {
            category: {
              name: {
                contains: key,
                mode: "insensitive"
              }
            }
          }
        ],
      }
    });
  }

  private async findStores(key: string) {
    return this.storeService.stores({
      where: {
        OR: [
          {
            name: {
              contains: key
            }
          },
          {
            description: {
              contains: key
            }
          },
        ]
      }
    });
  }

}
