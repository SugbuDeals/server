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
import { RecommendationType, IntentType } from './dto/recommendation.dto';
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
   * Gets intelligent recommendations based on a natural language query using tool calling.
   * 
   * Unified AI agent endpoint that handles four modes:
   * - Product Recommendation: Searches for products matching the query
   * - Store Recommendation: Searches for stores matching the query
   * - Promotion Recommendation: Searches for active promotions matching the query
   * - General Chat: Provides conversational responses without tool calling
   * 
   * The agent automatically detects intent from the query, or uses the explicit intent if provided.
   * When coordinates are provided, results are filtered within the specified radius and sorted by
   * combined relevance (70%) and proximity (30%) scores.
   * 
   * @param query - Natural language query from the user
   * @param count - Maximum number of results to return (default: 3)
   * @param latitude - Optional user latitude for distance calculation (-90 to 90)
   * @param longitude - Optional user longitude for distance calculation (-180 to 180)
   * @param radius - Optional search radius in kilometers (5, 10, or 15 - defaults to 5)
   * @param intent - Optional explicit intent specification (PRODUCT, STORE, PROMOTION, or CHAT)
   * @returns Structured recommendation response with text and data
   * @throws {Error} If coordinates are invalid (out of range or only one provided) or radius is invalid
   */
  async getRecommendationsFromQuery(
    query: string,
    count: number = 3,
    latitude?: number,
    longitude?: number,
    radius?: number,
    intent?: IntentType,
  ): Promise<RecommendationResponseDto> {
    // Validate coordinates if provided
    if (latitude !== undefined || longitude !== undefined) {
      if (latitude === undefined || longitude === undefined) {
        throw new Error('Both latitude and longitude must be provided together');
      }
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
    }

    // Validate radius if provided
    if (radius !== undefined) {
      if (![5, 10, 15].includes(radius)) {
        throw new Error('Radius must be 5, 10, or 15 kilometers');
      }
    }

    // Handle explicit CHAT intent - bypass tool calling
    if (intent === IntentType.CHAT) {
      return this.handleGeneralChat(query, latitude, longitude);
    }

    // If user asks to see all products, bypass AI and return the catalog summary
    if (this.isShowAllProductsQuery(query)) {
      return this.listAllProductsSummary();
    }

    // Use tool calling to get recommendations
    return this.runToolCallingWithErrorHandling(query, count, latitude, longitude, radius, intent);
  }

  /**
   * Handles general chat queries without tool calling.
   * 
   * Provides conversational responses for queries that don't require
   * product/store/promotion recommendations. Still considers location
   * context if provided for conversational queries about nearby places.
   * 
   * @param query - User's conversational query
   * @param latitude - Optional user latitude for location context
   * @param longitude - Optional user longitude for location context
   * @returns Chat response with conversational text
   */
  private async handleGeneralChat(
    query: string,
    latitude?: number,
    longitude?: number,
  ): Promise<RecommendationResponseDto> {
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      {
        role: 'system',
        content: `You are a helpful shopping assistant. The user is engaging in general conversation. Be friendly, helpful, and conversational. ${latitude !== undefined && longitude !== undefined ? `The user is located at coordinates (${latitude}, ${longitude}) - you can mention this if relevant to the conversation.` : ''}`,
      },
      {
        role: 'user',
        content: query,
      },
    ];

    const response = await this.chat(messages);
    
    return {
      recommendation: response.content,
      intent: RecommendationType.CHAT,
    };
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
   * Implements location-aware filtering when coordinates are provided:
   * - Filters products from stores within the specified radius
   * - Sorts results by distance (closest first)
   * - Considers both keyword relevance and proximity
   * 
   * @param params - Search parameters including query, maxResults, and optional location data
   * @returns Tool call result with product IDs that match the search criteria
   * @throws {ToolExecutionException} If coordinates are invalid or radius is invalid
   */
  private async searchProductsTool(params: SearchProductsParams): Promise<ToolCallResult> {
    try {
      // Validate coordinates if provided
      if (params.latitude !== undefined || params.longitude !== undefined) {
        if (params.latitude === undefined || params.longitude === undefined) {
          throw new ToolExecutionException('search_products', 'Both latitude and longitude must be provided together');
        }
        if (params.latitude < -90 || params.latitude > 90) {
          throw new ToolExecutionException('search_products', 'Latitude must be between -90 and 90');
        }
        if (params.longitude < -180 || params.longitude > 180) {
          throw new ToolExecutionException('search_products', 'Longitude must be between -180 and 180');
        }
      }

      // Validate radius if provided
      if (params.radius !== undefined) {
        if (![5, 10, 15].includes(params.radius)) {
          throw new ToolExecutionException('search_products', 'Radius must be 5, 10, or 15 kilometers');
        }
      }

      const maxResults = params.maxResults || 10;
      const query = params.query.toLowerCase();
      const radiusKm = params.radius || 5; // Default radius for location filtering

      // Get all products with store information
      const allProducts = await this.productService.products({
        include: { store: true },
        where: { isActive: true },
      });

      // Simple keyword matching - in production, you might use a more sophisticated search
      let matchingProducts = allProducts
        .filter((product) => {
          const searchText = `${product.name} ${product.description}`.toLowerCase();
          const keywords = query.split(/\s+/);
          return keywords.some((keyword) => searchText.includes(keyword));
        });

      // Apply location filtering if coordinates provided
      if (params.latitude !== undefined && params.longitude !== undefined) {
        matchingProducts = matchingProducts
          .map((product) => {
            const productWithStore = product as Product & { store: Store | null };
            let distance: number | null = null;

            if (productWithStore.store?.latitude && productWithStore.store?.longitude) {
              distance = this.calculateDistance(
                params.latitude!,
                params.longitude!,
                productWithStore.store.latitude,
                productWithStore.store.longitude,
              );
            }

            return { product, distance };
          })
          .filter((item) => item.distance !== null && item.distance <= radiusKm)
          .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
          .slice(0, maxResults)
          .map((item) => item.product);
      } else {
        matchingProducts = matchingProducts.slice(0, maxResults);
      }

      const productIds = matchingProducts.map((p: Product) => p.id);

      return { productIds };
    } catch (error) {
      if (error instanceof ToolExecutionException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new ToolExecutionException('search_products', errorMessage);
    }
  }

  /**
   * Tool implementation: Search Stores
   * 
   * Searches for stores matching the query and returns store IDs.
   * Implements location-aware filtering when coordinates are provided:
   * - Uses storeService.findNearby() for efficient location-based queries
   * - Filters stores within the specified radius
   * - Sorts results by distance (closest first)
   * - Considers both keyword relevance and proximity
   * 
   * @param params - Search parameters including query, maxResults, and optional location data
   * @returns Tool call result with store IDs that match the search criteria
   * @throws {ToolExecutionException} If coordinates are invalid or radius is invalid
   */
  private async searchStoresTool(params: SearchStoresParams): Promise<ToolCallResult> {
    try {
      // Validate coordinates if provided
      if (params.latitude !== undefined || params.longitude !== undefined) {
        if (params.latitude === undefined || params.longitude === undefined) {
          throw new ToolExecutionException('search_stores', 'Both latitude and longitude must be provided together');
        }
        if (params.latitude < -90 || params.latitude > 90) {
          throw new ToolExecutionException('search_stores', 'Latitude must be between -90 and 90');
        }
        if (params.longitude < -180 || params.longitude > 180) {
          throw new ToolExecutionException('search_stores', 'Longitude must be between -180 and 180');
        }
      }

      // Validate radius if provided
      if (params.radius !== undefined) {
        if (![5, 10, 15].includes(params.radius)) {
          throw new ToolExecutionException('search_stores', 'Radius must be 5, 10, or 15 kilometers');
        }
      }

      const maxResults = params.maxResults || 10;
      const query = params.query.toLowerCase();
      const radiusKm = params.radius || 5; // Default radius for location filtering

      let matchingStores: Store[];

      // Apply location filtering if coordinates provided
      if (params.latitude !== undefined && params.longitude !== undefined) {
        // Get nearby stores (already filtered by radius and sorted by distance)
        const nearbyStores = await this.storeService.findNearby(
          params.latitude,
          params.longitude,
          radiusKm,
        ) as Store[];

        // Filter by keyword matching
        matchingStores = nearbyStores
          .filter((store) => {
            const searchText = `${store.name} ${store.description}`.toLowerCase();
            const keywords = query.split(/\s+/);
            return keywords.some((keyword) => searchText.includes(keyword));
          })
          .slice(0, maxResults);
      } else {
        // Get all stores and filter by keyword
        const allStores = await this.storeService.stores({
          where: { isActive: true },
        });

        matchingStores = allStores
          .filter((store) => {
            const searchText = `${store.name} ${store.description}`.toLowerCase();
            const keywords = query.split(/\s+/);
            return keywords.some((keyword) => searchText.includes(keyword));
          })
          .slice(0, maxResults);
      }

      const storeIds = matchingStores.map((s) => s.id);

      return { storeIds };
    } catch (error) {
      if (error instanceof ToolExecutionException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new ToolExecutionException('search_stores', errorMessage);
    }
  }

  /**
   * Tool implementation: Search Promotions
   * 
   * Searches for active promotions matching the query and returns promotion IDs.
   * Implements location-aware filtering when coordinates are provided:
   * - Fetches associated product and store data for each promotion
   * - Filters promotions from stores within the specified radius
   * - Sorts results by distance (closest first)
   * - Considers both keyword relevance and proximity
   * 
   * @param params - Search parameters including query, maxResults, and optional location data
   * @returns Tool call result with promotion IDs that match the search criteria
   * @throws {ToolExecutionException} If coordinates are invalid or radius is invalid
   */
  private async searchPromotionsTool(params: SearchPromotionsParams): Promise<ToolCallResult> {
    try {
      // Validate coordinates if provided
      if (params.latitude !== undefined || params.longitude !== undefined) {
        if (params.latitude === undefined || params.longitude === undefined) {
          throw new ToolExecutionException('search_promotions', 'Both latitude and longitude must be provided together');
        }
        if (params.latitude < -90 || params.latitude > 90) {
          throw new ToolExecutionException('search_promotions', 'Latitude must be between -90 and 90');
        }
        if (params.longitude < -180 || params.longitude > 180) {
          throw new ToolExecutionException('search_promotions', 'Longitude must be between -180 and 180');
        }
      }

      // Validate radius if provided
      if (params.radius !== undefined) {
        if (![5, 10, 15].includes(params.radius)) {
          throw new ToolExecutionException('search_promotions', 'Radius must be 5, 10, or 15 kilometers');
        }
      }

      const maxResults = params.maxResults || 10;
      const query = params.query.toLowerCase();
      const radiusKm = params.radius || 5; // Default radius for location filtering

      // Get all active promotions with product and store information
      const activePromotions = await this.promotionService.findActive();
      
      // Fetch product and store data for promotions that have productId
      const promotionsWithLocation = await Promise.all(
        activePromotions.map(async (promo) => {
          if (!promo.productId) {
            return { promo, product: null, store: null, distance: null };
          }
          
          const product = await this.productService.product({ id: promo.productId });
          if (!product || !product.storeId) {
            return { promo, product, store: null, distance: null };
          }
          
          const store = await this.storeService.store({ where: { id: product.storeId } });
          return { promo, product, store, distance: null };
        })
      );

      // Simple keyword matching
      type PromotionWithLocation = {
        promo: Promotion;
        product: Product | null;
        store: Store | null;
        distance: number | null;
      };

      let matchingPromotions: PromotionWithLocation[] = promotionsWithLocation
        .filter((item) => {
          const searchText = `${item.promo.title} ${item.promo.description} ${item.promo.type}`.toLowerCase();
          const keywords = query.split(/\s+/);
          return keywords.some((keyword) => searchText.includes(keyword));
        });

      // Apply location filtering if coordinates provided
      if (params.latitude !== undefined && params.longitude !== undefined) {
        matchingPromotions = matchingPromotions
          .map((item) => {
            let distance: number | null = item.distance;

            if (item.store?.latitude && item.store?.longitude) {
              distance = this.calculateDistance(
                params.latitude!,
                params.longitude!,
                item.store.latitude,
                item.store.longitude,
              );
            }

            return { ...item, distance };
          })
          .filter((item) => item.distance !== null && item.distance <= radiusKm)
          .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
          .slice(0, maxResults);
      } else {
        matchingPromotions = matchingPromotions.slice(0, maxResults);
      }

      const promotionIds = matchingPromotions.map((item) => item.promo.id);

      return { promotionIds };
    } catch (error) {
      if (error instanceof ToolExecutionException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new ToolExecutionException('search_promotions', errorMessage);
    }
  }

  /**
   * Executes a single tool call.
   * 
   * @param toolCall - The tool call from Groq API
   * @param latitude - Optional user latitude to inject into tool call
   * @param longitude - Optional user longitude to inject into tool call
   * @param radius - Optional search radius to inject into tool call
   * @returns Tool execution result
   */
  private async executeToolCall(
    toolCall: GroqToolCall,
    latitude?: number,
    longitude?: number,
    radius?: number,
  ): Promise<ToolCallResult> {
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

    // Inject coordinates if available and not already provided by AI
    if (latitude !== undefined && longitude !== undefined) {
      if (functionArgs.latitude === undefined && functionArgs.longitude === undefined) {
        functionArgs.latitude = latitude;
        functionArgs.longitude = longitude;
      }
    }

    // Inject radius if available and not already provided by AI
    if (radius !== undefined) {
      if (functionArgs.radius === undefined) {
        functionArgs.radius = radius;
      }
    }

    // Execute function
    const functionToCall = this.availableFunctions[functionName as keyof AvailableTools];
    return await functionToCall(functionArgs);
  }

  /**
   * Calls Groq API with tools, with retry logic and temperature adjustment.
   * 
   * Implements retry logic following Groq best practices. If a 400 error occurs
   * (often due to invalid tool call format), retries with increased temperature
   * to encourage different tool call generation.
   * 
   * @param messages - Conversation messages including system, user, assistant, and tool messages
   * @param tools - Tool schemas array to provide to Groq API
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns Groq API response with tool calls or final message
   * @throws {GroqApiException} If all retry attempts fail or non-retryable error occurs
   */
  private async callWithToolsAndRetry(
    messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string; name?: string }>,
    tools: typeof toolSchemas,
    maxRetries: number = 3,
  ): Promise<Awaited<ReturnType<typeof this.groq.chat.completions.create>>> {
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
          this.logger.warn(`Tool call failed (attempt ${attempt + 1}/${maxRetries}), retrying with temperature ${temperature}`);
          continue;
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Groq API call failed: ${errorMessage}`, { statusCode, attempt: attempt + 1 });
        throw new GroqApiException(errorMessage, statusCode);
      }
    }

    throw new GroqApiException('Failed to generate valid tool calls after retries');
  }

  /**
   * Main tool calling orchestration loop with enhanced intent detection.
   * 
   * Implements Groq's local tool calling pattern with:
   * - Enhanced system prompt for better intent detection
   * - Automatic intent classification (Product, Store, Promotion, or Chat)
   * - Location-aware tool calls when coordinates are provided
   * - Retry logic with temperature adjustment
   * - Structured error handling
   * 
   * @param userQuery - User's natural language query
   * @param maxResults - Maximum number of results to return
   * @param latitude - Optional user latitude
   * @param longitude - Optional user longitude
   * @param radius - Optional search radius in kilometers
   * @param explicitIntent - Optional explicit intent to override auto-detection
   * @returns Structured recommendation response
   * @throws {MaxIterationsException} If maximum iterations reached without completion
   * @throws {ToolCallException} If tool calling loop encounters an error
   */
  private async runToolCallingWithErrorHandling(
    userQuery: string,
    maxResults: number,
    latitude?: number,
    longitude?: number,
    radius?: number,
    explicitIntent?: IntentType,
  ): Promise<RecommendationResponseDto> {
    const messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string; name?: string }> = [
      {
        role: 'user',
        content: userQuery,
      },
    ];

    // Build enhanced system prompt following Groq best practices
    let systemPrompt = `You are an intelligent shopping assistant AI agent. Your role is to help users find products, stores, and promotions, or engage in general conversation.

INTENT DETECTION GUIDELINES:
- PRODUCT: Use search_products when users ask about products, items, goods, merchandise, or specific product categories (e.g., "laptops", "smartphones", "find products", "show me items")
- STORE: Use search_stores when users ask about shops, sellers, merchants, retailers, or places to buy (e.g., "electronics stores", "where can I buy", "find shops")
- PROMOTION: Use search_promotions when users ask about deals, discounts, sales, promotions, or special offers (e.g., "discounts", "sales", "deals on smartphones")
- CHAT: If the query is a general question, greeting, or conversation not related to shopping recommendations, respond conversationally WITHOUT using tools

TOOL USAGE RULES:
1. Always use the most appropriate tool based on the user's intent
2. Include the user's exact query or relevant keywords in the tool's query parameter
3. When location coordinates are provided, ALWAYS include them in tool calls for location-aware results
4. After getting tool results, provide a natural, conversational explanation of the recommendations
5. If the query doesn't match product/store/promotion patterns, respond conversationally without tools

RESPONSE STYLE:
- Be helpful, friendly, and conversational
- Explain why you're recommending specific items
- Mention distance if location data is available
- If no results found, suggest alternative searches`;

    if (latitude !== undefined && longitude !== undefined) {
      const radiusKm = radius || 5;
      systemPrompt += `\n\nLOCATION CONTEXT: The user has provided their location coordinates (latitude: ${latitude}, longitude: ${longitude}). When using search tools, ALWAYS include these coordinates in your tool calls to prioritize nearby results within a ${radiusKm}km radius. Results will be sorted by both relevance to the query and proximity to the user.`;
      if (radius !== undefined) {
        systemPrompt += ` The user has specified a search radius of ${radius}km.`;
      }
    }

    if (explicitIntent && explicitIntent !== IntentType.CHAT) {
      systemPrompt += `\n\nEXPLICIT INTENT: The user has specified they want ${explicitIntent} recommendations. Focus on using the ${explicitIntent === IntentType.PRODUCT ? 'search_products' : explicitIntent === IntentType.STORE ? 'search_stores' : 'search_promotions'} tool.`;
    }
    
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

        // Type guard: ensure we have a ChatCompletion (not a Stream)
        if (!('choices' in response)) {
          throw new GroqApiException('Unexpected stream response when stream is disabled');
        }

        // Check if we're done (no tool calls)
        if (!response.choices[0]?.message.tool_calls || response.choices[0].message.tool_calls.length === 0) {
          // Final response - extract recommendation text
          const recommendationText = response.choices[0]?.message.content || 'I found some recommendations for you.';
          
          // Determine intent based on collected IDs or explicit intent
          if (explicitIntent) {
            // IntentType and RecommendationType have the same values, safe to map
            detectedIntent = explicitIntent as unknown as RecommendationType;
          } else if (collectedProductIds.length > 0) {
            detectedIntent = RecommendationType.PRODUCT;
          } else if (collectedStoreIds.length > 0) {
            detectedIntent = RecommendationType.STORE;
          } else if (collectedPromotionIds.length > 0) {
            detectedIntent = RecommendationType.PROMOTION;
          } else {
            // No tool calls and no results - likely general chat
            detectedIntent = RecommendationType.CHAT;
            return {
              recommendation: recommendationText,
              intent: RecommendationType.CHAT,
            };
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
            const result = await this.executeToolCall(toolCall as GroqToolCall, latitude, longitude, radius);

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
            // Add structured error result for this tool call
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorDetails: { error: string; is_error: boolean; tool_name?: string } = {
              error: errorMessage,
              is_error: true,
              tool_name: toolCall.function.name,
            };
            
            this.logger.warn(`Tool call failed: ${toolCall.function.name} - ${errorMessage}`);
            
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(errorDetails),
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
   * Implements combined relevance + distance scoring for location-aware recommendations.
   * Results are sorted by a weighted combination of:
   * - Relevance score (70%): Based on keyword matching and semantic relevance
   * - Distance score (30%): Normalized distance (closer = higher score)
   * 
   * @param recommendationText - AI-generated recommendation text
   * @param intent - Detected intent (product, store, promotion, or chat)
   * @param productIds - Collected product IDs (already filtered by relevance)
   * @param storeIds - Collected store IDs (already filtered by relevance)
   * @param promotionIds - Collected promotion IDs (already filtered by relevance)
   * @param maxResults - Maximum number of results
   * @param latitude - Optional user latitude for distance calculation
   * @param longitude - Optional user longitude for distance calculation
   * @returns Structured recommendation response with results sorted by combined score
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

    // Build product recommendations with relevance + distance scoring
    if (productIds.length > 0 && intent === RecommendationType.PRODUCT) {
      const products = await this.productService.products({
        where: { id: { in: productIds } },
        include: { store: true },
      });

      // Calculate combined scores and sort
      const productsWithScores = await Promise.all(
        products.map(async (product) => {
          let distance: number | null = null;
          let combinedScore = 1.0; // Default relevance score (products already filtered by relevance)
          
          // Type assertion for product with store relation
          const productWithStore = product as Product & { store: Store | null };

          if (latitude && longitude && productWithStore.store?.latitude && productWithStore.store?.longitude) {
            distance = this.calculateDistance(
              latitude,
              longitude,
              productWithStore.store.latitude,
              productWithStore.store.longitude,
            );
            
            // Normalize distance to score (closer = higher score, max distance 50km for normalization)
            const maxDistance = 50;
            const normalizedDistance = Math.min(distance / maxDistance, 1);
            const distanceScore = 1 - normalizedDistance; // Closer = higher score
            
            // Combined score: 70% relevance (already 1.0 from filtering) + 30% distance
            combinedScore = 0.7 * 1.0 + 0.3 * distanceScore;
          }

          return {
            product: {
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.price.toString(),
              imageUrl: product.imageUrl,
              storeId: product.storeId,
              storeName: productWithStore.store?.name || null,
              distance,
            },
            score: combinedScore,
          };
        }),
      );

      // Sort by combined score (highest first) and take top results
      productsWithScores.sort((a, b) => b.score - a.score);
      response.products = productsWithScores
        .slice(0, maxResults)
        .map((item) => item.product);
    }

    // Build store recommendations with relevance + distance scoring
    if (storeIds.length > 0 && intent === RecommendationType.STORE) {
      const stores = await this.storeService.stores({
        where: { id: { in: storeIds } },
      });

      // Calculate combined scores and sort
      const storesWithScores = await Promise.all(
        stores.map(async (store) => {
          let distance: number | null = null;
          let combinedScore = 1.0; // Default relevance score (stores already filtered by relevance)

          if (latitude && longitude && store.latitude && store.longitude) {
            distance = this.calculateDistance(
              latitude,
              longitude,
              store.latitude,
              store.longitude,
            );
            
            // Normalize distance to score (closer = higher score, max distance 50km for normalization)
            const maxDistance = 50;
            const normalizedDistance = Math.min(distance / maxDistance, 1);
            const distanceScore = 1 - normalizedDistance; // Closer = higher score
            
            // Combined score: 70% relevance (already 1.0 from filtering) + 30% distance
            combinedScore = 0.7 * 1.0 + 0.3 * distanceScore;
          }

          return {
            store: {
              id: store.id,
              name: store.name,
              description: store.description,
              imageUrl: store.imageUrl,
              latitude: store.latitude,
              longitude: store.longitude,
              address: store.address,
              city: store.city,
              distance,
            },
            score: combinedScore,
          };
        }),
      );

      // Sort by combined score (highest first) and take top results
      storesWithScores.sort((a, b) => b.score - a.score);
      response.stores = storesWithScores
        .slice(0, maxResults)
        .map((item) => item.store);
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
   * The Haversine formula calculates the great-circle distance between two points
   * on a sphere (Earth), which is accurate for most use cases. This is used for
   * location-aware recommendations to determine proximity.
   * 
   * @param lat1 - Latitude of first point (user location, -90 to 90)
   * @param lon1 - Longitude of first point (user location, -180 to 180)
   * @param lat2 - Latitude of second point (store/product location, -90 to 90)
   * @param lon2 - Longitude of second point (store/product location, -180 to 180)
   * @returns Distance in kilometers, rounded to 2 decimal places
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
   * Helper function for distance calculations using the Haversine formula.
   * 
   * @param deg - Angle in degrees
   * @returns Angle in radians
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
