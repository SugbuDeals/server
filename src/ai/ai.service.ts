import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk';
import { ProductService } from '../product/product.service';
import { PromotionService } from '../promotion/promotion.service';
import { Product, Store, Promotion } from 'generated/prisma';
import { StoreService } from '../store/store.service';
import { toolSchemas } from './types/tool-schemas.types';
import {
  AvailableTools,
  SearchProductsParams,
  SearchStoresParams,
  SearchPromotionsParams,
  ToolCallResult,
  GroqToolCall,
} from './types/tool-implementations.types';
import {
  ToolExecutionException,
  ToolCallException,
  MaxIterationsException,
  ToolNotFoundException,
  GroqApiException,
} from './exceptions/ai.exceptions';
import { RecommendationResponseDto } from './dto/recommendation-response.dto';
import { RecommendationType } from './dto/recommendation.dto';
import { ChatResponseDto } from './dto/chat-response.dto';
import { SimilarProductsResponseDto } from './dto/similar-products-response.dto';

/**
 * AI Service
 * 
 * Provides AI-powered features using the Groq SDK with local tool calling.
 * Handles chat interactions, text generation, and intelligent product/store/promotion recommendations.
 * 
 * Features:
 * - Natural language chat with AI assistant
 * - Text generation for various purposes
 * - Intelligent product recommendations using tool calling
 * - Store recommendations with location-based filtering using tool calling
 * - Promotion recommendations using tool calling
 * - Structured responses for frontend consumption
 * 
 * The service uses Groq's API with configurable model (default: openai/gpt-oss-120b for tool calling).
 * Requires GROQ_API_KEY environment variable.
 */
@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private groq: Groq;
  private readonly availableFunctions: AvailableTools;

  constructor(
    private configService: ConfigService,
    private productService: ProductService,
    private promotionService: PromotionService,
    private storeService: StoreService,
  ) {
    // Initialize tool function map
    this.availableFunctions = {
      search_products: this.searchProductsTool.bind(this),
      search_stores: this.searchStoresTool.bind(this),
      search_promotions: this.searchPromotionsTool.bind(this),
    };
  }

  async onModuleInit() {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }
    this.groq = new Groq({ apiKey });
  }

  /**
   * Gets the Groq model name from configuration.
   * Defaults to 'openai/gpt-oss-120b' which is recommended for tool calling.
   * 
   * @returns The model name to use for API calls
   */
  async getModelName(): Promise<string> {
    return (
      this.configService.get<string>('GROQ_MODEL_NAME') || 'openai/gpt-oss-120b'
    );
  }

  /**
   * Chat with the AI assistant.
   * 
   * Sends a conversation to the AI and receives a response.
   * Supports multi-turn conversations with message history.
   * 
   * @param messages - Array of conversation messages
   * @param options - Optional chat parameters (temperature, max_tokens, etc.)
   * @returns AI chat response message
   */
  async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: Partial<{ temperature: number; max_tokens: number; top_p: number; stream: boolean; model: string }>,
  ): Promise<ChatResponseDto> {
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
        const message = completion.choices[0]?.message;
        if (!message) {
          throw new GroqApiException('No message returned from Groq API');
        }
        return {
          role: message.role as 'user' | 'assistant' | 'system',
          content: message.content || '',
        };
      }

      // If a streaming response was requested, we currently do not support
      // accumulating streamed chunks in this helper.
      throw new Error('Streaming responses are not supported by chat() helper yet.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const statusCode = (error as { status?: number })?.status;
      throw new GroqApiException(errorMessage, statusCode);
    }
  }

  /**
   * Generates text using AI.
   * 
   * Takes a prompt and generates text based on it.
   * Useful for content generation, summaries, descriptions, etc.
   * 
   * @param prompt - The text prompt to generate from
   * @returns Generated text response
   */
  async generateText(prompt: string): Promise<ChatResponseDto> {
    return this.chat([{ role: 'user', content: prompt }]);
  }

  /**
   * Gets intelligent recommendations based on a natural language query using tool calling.
   * 
   * Uses Groq's local tool calling pattern to search for products, stores, or promotions
   * based on the user's query. Returns structured data with recommendation text and results.
   * 
   * @param query - Natural language query from the user
   * @param count - Maximum number of results to return (default: 3)
   * @param latitude - Optional user latitude for distance calculation
   * @param longitude - Optional user longitude for distance calculation
   * @returns Structured recommendation response with text and data
   */
  async getRecommendationsFromQuery(
    query: string,
    count: number = 3,
    latitude?: number,
    longitude?: number,
  ): Promise<RecommendationResponseDto> {
    // If user asks to see all products, bypass AI and return the catalog summary
    if (this.isShowAllProductsQuery(query)) {
      return this.listAllProductsSummary();
    }

    // Use tool calling to get recommendations
    return this.runToolCallingWithErrorHandling(query, count, latitude, longitude);
  }

  /**
   * Checks if the query is asking to show all products.
   * 
   * @param query - User query string
   * @returns True if query is asking to list all products
   */
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

  /**
   * Returns a summary of all products without AI processing.
   * 
   * @returns Recommendation response with all products listed
   */
  private async listAllProductsSummary(): Promise<RecommendationResponseDto> {
    const products = await this.productService.products({});
    const summary = products
      .map((p) => `${p.name} (₱${p.price})`)
      .join(', ');
    
    return {
      recommendation: summary ? `Available products: ${summary}` : 'No products available.',
      intent: RecommendationType.PRODUCT,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        imageUrl: p.imageUrl,
        storeId: p.storeId,
        storeName: null,
        distance: null,
      })),
    };
  }

  /**
   * Tool implementation: Search Products
   * 
   * Searches for products matching the query and returns product IDs.
   * 
   * @param params - Search parameters
   * @returns Tool call result with product IDs
   */
  private async searchProductsTool(params: SearchProductsParams): Promise<ToolCallResult> {
    try {
      const maxResults = params.maxResults || 10;
      const query = params.query.toLowerCase();

      // Get all products with store information
      const allProducts = await this.productService.products({
        include: { store: true },
        where: { isActive: true },
      });

      // Simple keyword matching - in production, you might use a more sophisticated search
      const matchingProducts = allProducts
        .filter((product) => {
          const searchText = `${product.name} ${product.description}`.toLowerCase();
          const keywords = query.split(/\s+/);
          return keywords.some((keyword) => searchText.includes(keyword));
        })
        .slice(0, maxResults);

      const productIds = matchingProducts.map((p: Product) => p.id);

      return { productIds };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new ToolExecutionException('search_products', errorMessage);
    }
  }

  /**
   * Tool implementation: Search Stores
   * 
   * Searches for stores matching the query and returns store IDs.
   * 
   * @param params - Search parameters
   * @returns Tool call result with store IDs
   */
  private async searchStoresTool(params: SearchStoresParams): Promise<ToolCallResult> {
    try {
      const maxResults = params.maxResults || 10;
      const query = params.query.toLowerCase();

      // Get all stores
      const allStores = await this.storeService.stores({
        where: { isActive: true },
      });

      // Simple keyword matching
      const matchingStores = allStores
        .filter((store) => {
          const searchText = `${store.name} ${store.description}`.toLowerCase();
          const keywords = query.split(/\s+/);
          return keywords.some((keyword) => searchText.includes(keyword));
        })
        .slice(0, maxResults);

      const storeIds = matchingStores.map((s) => s.id);

      return { storeIds };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new ToolExecutionException('search_stores', errorMessage);
    }
  }

  /**
   * Tool implementation: Search Promotions
   * 
   * Searches for active promotions matching the query and returns promotion IDs.
   * 
   * @param params - Search parameters
   * @returns Tool call result with promotion IDs
   */
  private async searchPromotionsTool(params: SearchPromotionsParams): Promise<ToolCallResult> {
    try {
      const maxResults = params.maxResults || 10;
      const query = params.query.toLowerCase();

      // Get all active promotions
      const activePromotions = await this.promotionService.findActive();

      // Simple keyword matching
      const matchingPromotions = activePromotions
        .filter((promo) => {
          const searchText = `${promo.title} ${promo.description} ${promo.type}`.toLowerCase();
          const keywords = query.split(/\s+/);
          return keywords.some((keyword) => searchText.includes(keyword));
        })
        .slice(0, maxResults);

      const promotionIds = matchingPromotions.map((p) => p.id);

      return { promotionIds };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new ToolExecutionException('search_promotions', errorMessage);
    }
  }

  /**
   * Executes a single tool call.
   * 
   * @param toolCall - The tool call from Groq API
   * @returns Tool execution result
   */
  private async executeToolCall(toolCall: GroqToolCall): Promise<ToolCallResult> {
    const functionName = toolCall.function.name;

    // Validate function exists
    if (!(functionName in this.availableFunctions)) {
      throw new ToolNotFoundException(functionName);
    }

    // Parse and validate arguments
    let functionArgs: SearchProductsParams | SearchStoresParams | SearchPromotionsParams;
    try {
      functionArgs = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      throw new ToolCallException('Invalid JSON in tool arguments', functionName);
    }

    // Execute function
    const functionToCall = this.availableFunctions[functionName as keyof AvailableTools];
    return await functionToCall(functionArgs);
  }

  /**
   * Calls Groq API with tools, with retry logic and temperature adjustment.
   * 
   * @param messages - Conversation messages
   * @param tools - Tool schemas to provide
   * @param maxRetries - Maximum number of retry attempts
   * @returns Groq API response
   */
  private async callWithToolsAndRetry(
    messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string; name?: string }>,
    tools: typeof toolSchemas,
    maxRetries: number = 3,
  ) {
    let temperature = 0.2;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.groq.chat.completions.create({
          model: await this.getModelName(),
          messages: messages as never,
          tools: tools as never,
          temperature,
        });
        return response;
      } catch (error) {
        const statusCode = (error as { status?: number })?.status;
        if (statusCode === 400 && attempt < maxRetries - 1) {
          temperature = Math.min(temperature + 0.2, 1.0);
          this.logger.warn(`Tool call failed, retrying with temperature ${temperature}`);
          continue;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new GroqApiException(errorMessage, statusCode);
      }
    }

    throw new GroqApiException('Failed to generate valid tool calls after retries');
  }

  /**
   * Main tool calling orchestration loop with error handling.
   * 
   * Implements the Groq local tool calling pattern with retry logic and iteration limits.
   * 
   * @param userQuery - User's natural language query
   * @param maxResults - Maximum number of results to return
   * @param latitude - Optional user latitude
   * @param longitude - Optional user longitude
   * @returns Structured recommendation response
   */
  private async runToolCallingWithErrorHandling(
    userQuery: string,
    maxResults: number,
    latitude?: number,
    longitude?: number,
  ): Promise<RecommendationResponseDto> {
    const messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string; name?: string }> = [
      {
        role: 'user',
        content: userQuery,
      },
    ];

    const systemPrompt = `You are a helpful shopping assistant. When users ask about products, stores, or promotions, use the appropriate search tool to find relevant results. After getting results, provide a natural, conversational recommendation explaining why these items match their query.`;
    
    messages.unshift({
      role: 'system',
      content: systemPrompt,
    });

    const maxIterations = 10;
    let detectedIntent: RecommendationType = RecommendationType.PRODUCT;
    let collectedProductIds: number[] = [];
    let collectedStoreIds: number[] = [];
    let collectedPromotionIds: number[] = [];

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      try {
        // Call model with tools
        const response = await this.callWithToolsAndRetry(messages, toolSchemas);

        // Check if we're done (no tool calls)
        if (!response.choices[0]?.message.tool_calls || response.choices[0].message.tool_calls.length === 0) {
          // Final response - extract recommendation text
          const recommendationText = response.choices[0]?.message.content || 'I found some recommendations for you.';
          
          // Determine intent based on collected IDs
          if (collectedProductIds.length > 0) {
            detectedIntent = RecommendationType.PRODUCT;
          } else if (collectedStoreIds.length > 0) {
            detectedIntent = RecommendationType.STORE;
          } else if (collectedPromotionIds.length > 0) {
            detectedIntent = RecommendationType.PROMOTION;
          }

          // Build and return structured response
          return await this.buildRecommendationResponse(
            recommendationText,
            detectedIntent,
            collectedProductIds,
            collectedStoreIds,
            collectedPromotionIds,
            maxResults,
            latitude,
            longitude,
          );
        }

        // Add assistant message with tool calls
        messages.push(response.choices[0].message as never);

        // Execute each tool call
        for (const toolCall of response.choices[0].message.tool_calls || []) {
          try {
            const result = await this.executeToolCall(toolCall as GroqToolCall);

            // Collect IDs from results
            if (result.productIds) {
              collectedProductIds = [...new Set([...collectedProductIds, ...result.productIds])];
            }
            if (result.storeIds) {
              collectedStoreIds = [...new Set([...collectedStoreIds, ...result.storeIds])];
            }
            if (result.promotionIds) {
              collectedPromotionIds = [...new Set([...collectedPromotionIds, ...result.promotionIds])];
            }

            // Add tool result to messages
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(result),
            });
          } catch (error) {
            // Add error result for this tool call
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({
                error: errorMessage,
                is_error: true,
              }),
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error in tool calling loop: ${errorMessage}`, error);
        throw new ToolCallException(`Error in tool calling loop: ${errorMessage}`);
      }
    }

    // Max iterations reached
    throw new MaxIterationsException(maxIterations);
  }

  /**
   * Builds the final recommendation response with structured data.
   * 
   * @param recommendationText - AI-generated recommendation text
   * @param intent - Detected intent (product, store, or promotion)
   * @param productIds - Collected product IDs
   * @param storeIds - Collected store IDs
   * @param promotionIds - Collected promotion IDs
   * @param maxResults - Maximum number of results
   * @param latitude - Optional user latitude
   * @param longitude - Optional user longitude
   * @returns Structured recommendation response
   */
  private async buildRecommendationResponse(
    recommendationText: string,
    intent: RecommendationType,
    productIds: number[],
    storeIds: number[],
    promotionIds: number[],
    maxResults: number,
    latitude?: number,
    longitude?: number,
  ): Promise<RecommendationResponseDto> {
    const response: RecommendationResponseDto = {
      recommendation: recommendationText,
      intent,
    };

    // Build product recommendations
    if (productIds.length > 0 && intent === RecommendationType.PRODUCT) {
      const products = await this.productService.products({
        where: { id: { in: productIds.slice(0, maxResults) } },
        include: { store: true },
      });

      response.products = await Promise.all(
        products.map(async (product) => {
          let distance: number | null = null;
          
          // Type assertion for product with store relation
          const productWithStore = product as Product & { store: Store | null };

          if (latitude && longitude && productWithStore.store?.latitude && productWithStore.store?.longitude) {
            distance = this.calculateDistance(
              latitude,
              longitude,
              productWithStore.store.latitude,
              productWithStore.store.longitude,
            );
          }

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price.toString(),
            imageUrl: product.imageUrl,
            storeId: product.storeId,
            storeName: productWithStore.store?.name || null,
            distance,
          };
        }),
      );
    }

    // Build store recommendations
    if (storeIds.length > 0 && intent === RecommendationType.STORE) {
      const stores = await this.storeService.stores({
        where: { id: { in: storeIds.slice(0, maxResults) } },
      });

      response.stores = await Promise.all(
        stores.map(async (store) => {
          let distance: number | null = null;

          if (latitude && longitude && store.latitude && store.longitude) {
            distance = this.calculateDistance(
              latitude,
              longitude,
              store.latitude,
              store.longitude,
            );
          }

          return {
            id: store.id,
            name: store.name,
            description: store.description,
            imageUrl: store.imageUrl,
            latitude: store.latitude,
            longitude: store.longitude,
            address: store.address,
            city: store.city,
            distance,
          };
        }),
      );
    }

    // Build promotion recommendations
    if (promotionIds.length > 0 && intent === RecommendationType.PROMOTION) {
      const promotions = await Promise.all(
        promotionIds.slice(0, maxResults).map((id) => this.promotionService.findOne(id)),
      );

      response.promotions = promotions
        .filter((p): p is Promotion => p !== null)
        .map((promo) => ({
          id: promo.id,
          title: promo.title,
          type: promo.type,
          description: promo.description,
          startsAt: promo.startsAt,
          endsAt: promo.endsAt,
          discount: promo.discount,
          productId: promo.productId,
        }));
    }

    return response;
  }

  /**
   * Calculates the distance between two coordinates using the Haversine formula.
   * 
   * @param lat1 - Latitude of first point
   * @param lon1 - Longitude of first point
   * @param lat2 - Latitude of second point
   * @param lon2 - Longitude of second point
   * @returns Distance in kilometers
   */
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

  /**
   * Converts degrees to radians.
   * 
   * @param deg - Degrees
   * @returns Radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }


  /**
   * Gets similar products to a given product.
   * 
   * @param productId - ID of the product to find similar items for
   * @param count - Number of similar products to return
   * @returns AI-generated recommendation text
   */
  async getSimilarProducts(productId: number, count: number = 3): Promise<SimilarProductsResponseDto> {
    const targetProduct = await this.productService.product({ id: productId });
    if (!targetProduct) {
      throw new Error('Product not found');
    }

    const products = await this.productService.products({
      where: {
        id: {
          not: productId,
        },
      },
    });

    const productsList = products
      .map((p) => `- ID: ${p.id}, ${p.name}: ${p.description} (Price: ₱${p.price})`)
      .join('\n');

    const prompt = `Target product:
- ${targetProduct.name}: ${targetProduct.description} (Price: ₱${targetProduct.price})

Other available products:
${productsList}

Task: Recommend exactly ${count} similar products.
Style: Brief, skimmable, actionable.
Format: Numbered list. For each item include exactly 3 short bullets:
- similarity: key reason it's similar to ${targetProduct.name}
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

    return {
      role: response.role,
      content: response.content,
    };
  }
}
