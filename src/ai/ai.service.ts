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

@Injectable()
export class AiService implements OnModuleInit {
  private groq: Groq;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private configService: ConfigService,
    private productService: ProductService,
    private promotionService: PromotionService,
    private storeService: StoreService,
  ) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException(
        'GROQ_API_KEY is not set in environment variables',
      );
    }
    this.groq = new Groq({ apiKey });
  }

  async getModelName(): Promise<string> {
    return (
      this.configService.get<string>('GROQ_MODEL_NAME') || 'llama2-70b-4096'
    );
  }

  /**
   * Prefer Groq compound models when using built-in tools.
   * See: https://console.groq.com/docs/tool-use/built-in-tools
   */
  private async getToolsModelName(): Promise<string> {
    return this.configService.get<string>('GROQ_TOOLS_MODEL_NAME') || 'groq/compound';
  }

  private buildProviderErrorMessage(context: string, error: any): string {
    const message = error?.message ?? 'Unknown error';
    const code =
      error?.response?.status ?? error?.status ?? error?.code ?? undefined;
    return code ? `${context}: ${message} (code: ${code})` : `${context}: ${message}`;
  }

  /**
   * Local tool definitions exposed to Groq for function calling.
   * See: https://console.groq.com/docs/tool-use/overview and
   * https://console.groq.com/docs/tool-use/local-tool-calling
   */
  private getLocalToolDefinitions() {
    return [
      {
        type: 'function',
        function: {
          name: 'search_products',
          description:
            'Searches products in the local catalog by name or description and returns a concise list of matches.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description:
                  'Free-text search query for product name or description (e.g. "rice cooker", "milk").',
              },
              limit: {
                type: 'integer',
                description: 'Maximum number of products to return.',
                minimum: 1,
                maximum: 50,
              },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'search_stores',
          description:
            'Searches nearby or matching stores by name or description and returns basic store info.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description:
                  'Free-text search query for store name or description (e.g. "grocery", "hardware").',
              },
              limit: {
                type: 'integer',
                description: 'Maximum number of stores to return.',
                minimum: 1,
                maximum: 50,
              },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'search_promotions',
          description:
            'Searches active promotions and returns matching deals with title, description, and discount.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description:
                  'Free-text search query for promotion title or description (e.g. "discount", "sale", "coupon").',
              },
              limit: {
                type: 'integer',
                description: 'Maximum number of promotions to return.',
                minimum: 1,
                maximum: 50,
              },
            },
            required: ['query'],
          },
        },
      },
    ];
  }

  private async executeLocalTool(
    name: string,
    args: any,
  ): Promise<unknown> {
    switch (name) {
      case 'search_products': {
        const query: string = args?.query ?? '';
        const limit: number = args?.limit ?? 10;
        const products = await this.productService.products({
          where: query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              }
            : undefined,
          take: Math.min(Math.max(limit, 1), 50),
        });
        return products.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          storeId: p.storeId,
        }));
      }
      case 'search_stores': {
        const query: string = args?.query ?? '';
        const limit: number = args?.limit ?? 10;
        const stores = await this.storeService.stores({
          where: query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { description: { contains: query, mode: 'insensitive' } },
                ],
              }
            : undefined,
          take: Math.min(Math.max(limit, 1), 50),
        });
        return stores.map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
        }));
      }
      case 'search_promotions': {
        const query: string = args?.query ?? '';
        const limit: number = args?.limit ?? 10;
        const now = new Date();
        const promotions = await this.promotionService.findAll();
        const filtered = promotions.filter((promo: any) => {
          const active =
            promo.active &&
            promo.startsAt &&
            new Date(promo.startsAt) <= now &&
            (!promo.endsAt || new Date(promo.endsAt) >= now);
          if (!active) return false;
          if (!query) return true;
          const haystack = `${promo.title ?? ''} ${promo.description ?? ''}`.toLowerCase();
          return haystack.includes(String(query).toLowerCase());
        });
        return filtered.slice(0, Math.min(Math.max(limit, 1), 50)).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          discount: p.discount,
          productId: p.productId,
        }));
      }
      default:
        throw new InternalServerErrorException(
          `Unknown local tool called by Groq: ${name}`,
        );
    }
  }

  private async classifyRecommendationIntent(
    query: string,
  ): Promise<{ intent: 'product' | 'store' | 'promotion' | 'chat'; confidence: number }> {
    const instruction = `You classify user queries into shopping-related intents.

Task: Classify the user's request into exactly one of these labels:
- "product"   -> asking about specific items, goods, categories, or features
- "store"     -> asking about shops, sellers, merchants, brands, places to buy
- "promotion" -> asking about deals, discounts, vouchers, coupons, sales
- "chat"      -> small talk, general questions, or anything not clearly about products, stores, or promotions

User query: "${query}"`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: await this.getModelName(),
        messages: [
          {
            role: 'system',
            content:
              'You are a precise intent classifier. You MUST reply with JSON only, matching the given schema.',
          },
          { role: 'user', content: instruction },
        ],
        temperature: 0,
        max_tokens: 50,
        top_p: 1,
        stream: false,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'intent_classification',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                intent: {
                  type: 'string',
                  enum: ['product', 'store', 'promotion', 'chat'],
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                },
              },
              required: ['intent', 'confidence'],
              additionalProperties: false,
            },
          },
        } as any,
      });

      const message = completion.choices?.[0]?.message;

      const content: any =
        typeof message?.content === 'string'
          ? JSON.parse(message.content)
          : message?.content;

      const intent =
        content?.intent === 'store' ||
        content?.intent === 'promotion' ||
        content?.intent === 'chat'
          ? content.intent
          : 'product';

      let confidence =
        typeof content?.confidence === 'number' &&
        content.confidence >= 0 &&
        content.confidence <= 1
          ? content.confidence
          : 0.5;

      // Clamp for safety
      confidence = Math.max(0, Math.min(1, confidence));

      return { intent, confidence };
    } catch (error: any) {
      this.logger.error(
        `Failed to classify recommendation intent for query="${query}"`,
        error?.stack || String(error),
      );
      throw new InternalServerErrorException(
        this.buildProviderErrorMessage(
          'Failed to classify recommendation intent',
          error,
        ),
      );
    }
  }

  async getRecommendationsFromQuery(
    query: string,
    count: number = 3,
    latitude?: number,
    longitude?: number,
  ) {
    // If user asks to see all products, bypass AI and return the catalog summary
    if (this.isShowAllProductsQuery(query)) {
      const summary = await this.listAllProductsSummary();
      return {
        classification: {
          intent: 'product',
          confidence: 1,
        },
        ...summary,
      };
    }

    try {
      // Let the model classify what kind of help the user wants
      const { intent, confidence } = await this.classifyRecommendationIntent(
        query,
      );

      // If confidence is low, fall back to general chat for safety
      const effectiveIntent = confidence < 0.5 ? 'chat' : intent;

      switch (effectiveIntent) {
        case 'promotion': {
          const response = await this.generatePromotionRecommendations(query, count);
          const content = (response as any)?.content ?? '';
          return {
            classification: { intent: 'promotion', confidence },
            recommendation: typeof content === 'string' ? content : String(content ?? ''),
          };
        }
        case 'store': {
          const response = await this.generateStoreRecommendations(query, count);
          const content = (response as any)?.content ?? '';
          return {
            classification: { intent: 'store', confidence },
            recommendation: typeof content === 'string' ? content : String(content ?? ''),
          };
        }
        case 'chat': {
          const response = await this.chat([{ role: 'user', content: query }]);
          const content = response?.content ?? '';
          return {
            classification: { intent: 'chat', confidence },
            reply: typeof content === 'string' ? content : String(content ?? ''),
          };
        }
        case 'product':
        default: {
          // Default: single product recommendation with one similar alternative in one paragraph
          const result = await this.generateProductRecommendations(
            query,
            1,
            latitude,
            longitude,
          );
          // Preserve existing shape but add explicit classification
          return {
            classification: { intent: 'product', confidence },
            ...result,
          };
        }
      }
    } catch (error: any) {
      this.logger.error(
        `AI recommendation pipeline failure for query="${query}"`,
        error?.stack || String(error),
      );
      // Align with NestJS error handling by throwing an HttpException subclass
      throw new InternalServerErrorException(
        this.buildProviderErrorMessage('AI recommendation pipeline failure', error),
      );
    }
  }

  private isShowAllProductsQuery(query: string): boolean {
    const q = (query || '').toLowerCase();
    return (
      q.includes('show all products') ||
      q.includes('see all products') ||
      q.includes('list all products') ||
      q.includes('list products') ||
      q.includes('browse products') ||
      q === 'all products' ||
      q === 'products'
    );
  }

  private async listAllProductsSummary() {
    const products = await this.productService.products({});
    const summary = products
      .map((p) => `${p.name} (₱${p.price})`)
      .join(', ');
    return {
      role: 'assistant',
      content: summary ? `Available products: ${summary}` : 'No products available.',
    };
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: Partial<{
      temperature: number;
      max_tokens: number;
      top_p: number;
      stream: boolean;
      model: string;
    }>,
  ) {
    try {
      const completion = await this.groq.chat.completions.create({
        messages,
        model: options?.model ?? (await this.getModelName()),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 1000,
        top_p: options?.top_p ?? 1,
        stream: options?.stream ?? false,
      });

      if ('choices' in completion) {
        return completion.choices[0]?.message;
      }

      // If a streaming response was requested, we currently do not support
      // accumulating streamed chunks in this helper.
      throw new InternalServerErrorException(
        'Streaming responses are not supported by chat() helper yet.',
      );
    } catch (error: any) {
      this.logger.error(
        'AI chat completion failure',
        error?.stack || String(error),
      );
      throw new InternalServerErrorException(
        this.buildProviderErrorMessage('AI chat completion failure', error),
      );
    }
  }

  /**
   * Agent-style chat that allows Groq to call local tools (products, stores, promotions)
   * and, when configured, Groq built-in tools.
   *
   * See: https://console.groq.com/docs/tool-use/overview
   */
  async agentChat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  ) {
    try {
      const tools = this.getLocalToolDefinitions();

      const initialMessages = [
        {
          role: 'system' as const,
          content:
            'You are a shopping assistant for a local marketplace. ' +
            'You can call tools to search products, stores, and promotions. ' +
            'Prefer calling tools when the user asks about specific items, shops, or deals.',
        },
        ...messages,
      ];

      // First call: let the model decide if tools are needed
      const firstCompletion = await this.groq.chat.completions.create({
        model: await this.getToolsModelName(),
        messages: initialMessages as any,
        tools: tools as any,
        tool_choice: 'auto' as any,
      });

      const firstMessage: any = firstCompletion.choices?.[0]?.message;
      const toolCalls: any[] = firstMessage?.tool_calls ?? [];

      if (!toolCalls.length) {
        return firstMessage;
      }

      // Execute each requested tool locally
      const toolMessages: any[] = [];

      for (const call of toolCalls) {
        const toolName = call.function?.name;
        let args: any = {};
        try {
          args =
            typeof call.function?.arguments === 'string'
              ? JSON.parse(call.function.arguments || '{}')
              : call.function?.arguments || {};
        } catch (parseError) {
          this.logger.error(
            `Failed to parse tool arguments for "${toolName}"`,
            (parseError as any)?.stack || String(parseError),
          );
          throw new InternalServerErrorException(
            `Failed to parse tool arguments for "${toolName}"`,
          );
        }

        const result = await this.executeLocalTool(toolName, args);

        toolMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: toolName,
          content: JSON.stringify(result),
        });
      }

      // Second call: provide tool results back to the model for final answer
      const secondCompletion = await this.groq.chat.completions.create({
        model: await this.getToolsModelName(),
        messages: [...initialMessages, firstMessage, ...toolMessages] as any,
      });

      return secondCompletion.choices?.[0]?.message;
    } catch (error: any) {
      this.logger.error(
        'AI agentChat with tools failure',
        error?.stack || String(error),
      );
      throw new InternalServerErrorException(
        this.buildProviderErrorMessage(
          'AI agentChat with tools failure',
          error,
        ),
      );
    }
  }

  async generateText(prompt: string) {
    return this.chat([{ role: 'user', content: prompt }]);
  }

  private async formatProductsForAI(products: Product[]): Promise<string> {
    return products
      .map((p) => `- ID: ${p.id}, ${p.name}: ${p.description} (Price: ₱${p.price})`)
      .join('\n');
  }

  async generateProductRecommendations(
    userPreferences: string,
    count: number = 3,
    latitude?: number,
    longitude?: number,
  ) {
    // First get all available products with store information
    const products = await this.productService.products({
      include: { store: true },
    });

    const productsList = await this.formatProductsForAI(products);

    const prompt = `Context — products:
${productsList}

User preferences: "${userPreferences}"

Task: Recommend exactly 1 primary product and exactly 1 similar alternative.
Style for "recommendation" field: One concise paragraph only. No lists, no headings, no extra lines.
In the paragraph, in this order, describe:
- Primary: {product name}, brief justification (≤18 words), Price: ₱{price}.
- Similar: {product name}, Price: ₱{price} (one short reason ≤8 words).

You must respond ONLY with a JSON object that matches this TypeScript type:
{
  "recommendation": string; // the single paragraph recommendation text described above
  "productIds": number[];   // exactly two numeric product IDs: [primary_product_id, similar_product_id]
}`;

    let recommendationText = '';
    let productIds: number[] = [];

    try {
      // Use Groq structured outputs to enforce JSON schema
      const completion = await this.groq.chat.completions.create({
        model: await this.getModelName(),
        messages: [
          {
            role: 'system',
            content:
              'You are a knowledgeable shopping assistant who provides thoughtful, personalized product recommendations. You MUST reply with valid JSON only, conforming exactly to the provided schema.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        stream: false,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'product_recommendation',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                recommendation: { type: 'string' },
                productIds: {
                  type: 'array',
                  items: { type: 'integer' },
                  minItems: 2,
                  maxItems: 2,
                },
              },
              required: ['recommendation', 'productIds'],
              additionalProperties: false,
            },
          },
        } as any,
      });

      const message = completion.choices?.[0]?.message;

      // Depending on SDK version, content may already be an object or a JSON string
      const content: any =
        typeof message?.content === 'string'
          ? JSON.parse(message.content)
          : message?.content;

      recommendationText =
        typeof content?.recommendation === 'string'
          ? content.recommendation
          : '';
      if (Array.isArray(content?.productIds)) {
        productIds = content.productIds
          .map((id: any) => Number(id))
          .filter((id: number) => Number.isFinite(id));
      }
    } catch (error: any) {
      this.logger.error(
        'AI product recommendation failure',
        error?.stack || String(error),
      );
      throw new InternalServerErrorException(
        this.buildProviderErrorMessage('AI product recommendation failure', error),
      );
    }

    // Basic validation & normalization of product IDs from model
    productIds = productIds
      .map((id: number) => Number(id))
      .filter((id) => Number.isFinite(id));

    if (productIds.length > 2) {
      productIds = productIds.slice(0, 2);
    }

    // Fallback: if no valid product IDs from structured output, try to infer from product names
    if (productIds.length === 0) {
      for (const product of products) {
        if (recommendationText.includes(product.name)) {
          productIds.push(product.id);
          if (productIds.length >= 2) break;
        }
      }
    }

    // Get recommended products with store information
    let recommendedProducts = await this.productService.products({
      where: productIds.length
        ? {
            id: { in: productIds },
          }
        : undefined,
      include: { store: true },
    });

    // Hard business rule fallback: if we still have no products (e.g. bad IDs),
    // fall back to the first few available products from the catalog.
    if (!recommendedProducts.length) {
      recommendedProducts = products.slice(0, 2);
      if (!recommendationText) {
        recommendationText =
          'Here are some available products that may match what you are looking for.';
      }
    }

    // Validate user location for distance calculations
    const hasValidUserLocation =
      latitude !== undefined &&
      longitude !== undefined &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    // Calculate distances if location is provided and valid
    const productsWithDistance = await Promise.all(
      recommendedProducts.map(async (product: any) => {
        let distance: number | null = null;

        // Only skip when coordinates are truly missing, not when they are 0
        if (
          hasValidUserLocation &&
          product.store?.latitude !== undefined &&
          product.store?.latitude !== null &&
          product.store?.longitude !== undefined &&
          product.store?.longitude !== null
        ) {
          // Use findNearby to get distance
          const nearbyStores = (await this.storeService.findNearby(
            latitude,
            longitude,
            1000, // Large radius to ensure we find the store
          )) as any[];
          
          const storeWithDistance = nearbyStores.find(
            (s: any) => s.id === product.storeId,
          );
          
          if (storeWithDistance && storeWithDistance.distance !== undefined) {
            distance = parseFloat(Number(storeWithDistance.distance).toFixed(2));
          } else {
            // Calculate distance manually using Haversine formula
            distance = this.calculateDistance(
              latitude,
              longitude,
              product.store.latitude,
              product.store.longitude,
            );
          }
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl || null,
          storeId: product.storeId,
          storeName: product.store?.name || null,
          distance: distance,
        };
      }),
    );

    return {
      recommendation: recommendationText.trim(),
      products: productsWithDistance,
    };
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return parseFloat(distance.toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private async formatPromotionsForAI(promotions: any[]): Promise<string> {
    return promotions
      .map((promo) => `- ${promo.title}: ${promo.description} (Type: ${promo.type}, Discount: ${promo.discount}%)`)
      .join('\n');
  }

  async generatePromotionRecommendations(
    userPreferences: string,
    count: number = 3,
  ) {
    const activePromotions = await this.promotionService.findActive();
    const promotionsList = await this.formatPromotionsForAI(activePromotions);

    const prompt = `Context — active promotions:
${promotionsList}

User preferences: "${userPreferences}"

Task: Recommend exactly ${count} promotions.
Style: Brief, skimmable, actionable.
Format: Numbered list. For each item include exactly 3 short bullets:
- match: ≤12 words
- applies_to: product/category if relevant
- benefit: ≤10 words`;

    const response = await this.chat([
      {
        role: 'system',
        content:
          'You are a helpful promotions assistant who selects the most relevant deals for the user.',
      },
      { role: 'user', content: prompt },
    ]);

    return response;
  }

  private async formatStoresForAI(stores: Store[]): Promise<string> {
    return stores
      .map((s) => `- ${s.name}: ${s.description}`)
      .join('\n');
  }

  async generateStoreRecommendations(
    userPreferences: string,
    count: number = 3,
  ) {
    const stores = await this.storeService.stores({});
    const storesList = await this.formatStoresForAI(stores);

    const prompt = `Context — stores:
${storesList}

User preferences: "${userPreferences}"

Task: Recommend exactly ${count} stores.
Style: Brief, skimmable, actionable.
Format: Numbered list. For each item include exactly 3 short bullets:
- match: ≤12 words
- known_for: what it’s known for
- benefit: ≤10 words`;

    const response = await this.chat([
      {
        role: 'system',
        content:
          'You are a helpful shopping assistant who recommends relevant stores to users.',
      },
      { role: 'user', content: prompt },
    ]);

    return response;
  }

  async getSimilarProducts(productId: number, count: number = 3) {
    const targetProduct = await this.productService.product({ id: productId });
    if (!targetProduct) {
      throw new NotFoundException('Product not found');
    }

    const products = await this.productService.products({
      where: {
        id: {
          not: productId,
        },
      },
    });

    const productsList = await this.formatProductsForAI(products);

    const prompt = `Target product:
- ${targetProduct.name}: ${targetProduct.description} (Price: ₱${targetProduct.price})

Other available products:
${productsList}

Task: Recommend exactly ${count} similar products.
Style: Brief, skimmable, actionable.
Format: Numbered list. For each item include exactly 3 short bullets:
- similarity: key reason it’s similar to ${targetProduct.name}
- diff: one notable difference
- why: ≤10 words on user value`;

    const response = await this.chat([
      {
        role: 'system',
        content:
          'You are a knowledgeable shopping assistant who provides thoughtful product recommendations based on similarities and complementary features.',
      },
      { role: 'user', content: prompt },
    ]);

    return response;
  }
}
