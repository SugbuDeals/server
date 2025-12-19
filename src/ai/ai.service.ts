import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk';
import { ProductService } from '../product/product.service';
import { PromotionService } from '../promotion/promotion.service';
import { Product, Store, Promotion, SubscriptionTier, UserRole, DealType } from 'generated/prisma';
import { StoreService } from '../store/store.service';
import { PrismaService } from '../prisma/prisma.service';
import { toolSchemas } from './types/tool-schemas.types';
import {
  AvailableTools,
  SearchProductsParams,
  SearchStoresParams,
  SearchPromotionsParams,
  SearchSimilarProductsParams,
  ToolCallResult,
  GroqToolCall,
} from './types/tool-implementations.types';
import { StoreVerificationStatus } from 'generated/prisma';
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
    private prisma: PrismaService,
  ) {
    // Initialize tool function map
    this.availableFunctions = {
      search_products: this.searchProductsTool.bind(this),
      search_stores: this.searchStoresTool.bind(this),
      search_promotions: this.searchPromotionsTool.bind(this),
      search_similar_products: this.searchSimilarProductsTool.bind(this),
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
   * Chat with the AI assistant (unified chatbot endpoint).
   * 
   * Intelligent chatbot that handles:
   * - General conversation
   * - Product recommendations
   * - Store recommendations
   * - Promotion recommendations
   * - Similar products queries
   * 
   * Uses tool calling to intelligently detect user intent and provide structured responses.
   * All recommendations only include products, stores, and promotions from verified stores.
   * 
   * **Subscription Tier Enforcement (Consumers only):**
   * - BASIC tier: Maximum 1km search radius
   * - PRO tier: Maximum 3km search radius
   * - Retailers and Admins: No radius limit
   * 
   * @param userId - Authenticated user ID for tier checking
   * @param userRole - User role for tier enforcement
   * @param content - User's message content
   * @param latitude - Optional user latitude for location-aware recommendations (-90 to 90)
   * @param longitude - Optional user longitude for location-aware recommendations (-180 to 180)
   * @param radius - Optional search radius in kilometers (default: 5, capped by subscription tier for consumers)
   * @param count - Maximum number of results (required, 1-10)
   * @param options - Optional chat parameters (temperature, max_tokens, etc.)
   * @returns AI chat response with optional structured data (products/stores/promotions)
   * @throws {Error} If radius exceeds user's subscription tier limit
   */
  async chat(
    userId: number,
    userRole: UserRole,
    content: string,
    latitude: number | undefined,
    longitude: number | undefined,
    radius: number | undefined,
    count: number,
    options?: Partial<{ temperature: number; max_tokens: number; top_p: number; stream: boolean; model: string }>,
  ): Promise<ChatResponseDto> {
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

    // Get user's subscription tier for radius limit enforcement (consumers only)
    let effectiveRadius = radius || 5; // Default to 5km if not specified
    
    if (userRole === UserRole.CONSUMER) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      });

      if (user) {
        const maxRadius = user.subscriptionTier === SubscriptionTier.PRO ? 3 : 1;
        
        // Cap the radius to the user's tier limit
        if (effectiveRadius > maxRadius) {
          this.logger.warn(
            `Consumer ${userId} requested ${effectiveRadius}km radius, capped to ${maxRadius}km (${user.subscriptionTier} tier)`,
          );
          effectiveRadius = maxRadius;
        }
      }
    }

    const maxResults = count;

    // Build system prompt for chatbot with tool calling
    let systemPrompt = `You are an intelligent shopping assistant chatbot. Your role is to help users find products, stores, and promotions, or engage in general conversation.

INTENT DETECTION GUIDELINES:
- PRODUCT: Use search_products when users ask about products, items, goods, merchandise, or specific product categories (e.g., "laptops", "smartphones", "find products", "show me items")
- STORE: Use search_stores when users ask about shops, sellers, merchants, retailers, or places to buy (e.g., "electronics stores", "where can I buy", "find shops")
- PROMOTION: Use search_promotions when users ask about deals, discounts, sales, promotions, or special offers (e.g., "discounts", "sales", "deals on smartphones")
- SIMILAR PRODUCTS: Use search_similar_products when users ask for similar products, alternatives, or other options like a specific product (e.g., "show me products similar to product 42", "what are alternatives to this")
- CHAT: If the query is a general question, greeting, or conversation not related to shopping recommendations, respond conversationally WITHOUT using tools

TOOL USAGE RULES:
1. Always use the most appropriate tool based on the user's intent
2. Include the user's exact query or relevant keywords in the tool's query parameter
3. When location coordinates are provided, ALWAYS include them in tool calls for location-aware results
4. After getting tool results, provide a natural, conversational explanation of the recommendations
5. If the query doesn't match product/store/promotion/similar patterns, respond conversationally without tools
6. When users mention a product ID and ask for similar items, use search_similar_products

RESPONSE STYLE:
- Be helpful, friendly, and conversational
- When tool results are returned, provide a GENERIC conversational response that does NOT mention specific product names, store names, or promotion titles
- The structured data (products/stores/promotions) will be returned separately - your content should be a general message like "I found some great options for you!" or "Here are some recommendations based on your search"
- Mention distance if location data is available (in general terms, not specific items)
- If no results found, suggest alternative searches
- Only recommend products, stores, and promotions from verified stores (this is handled automatically by the tools)
- CRITICAL: When structured data is present, your content should be generic and conversational. Do NOT list specific products, stores, or promotions in the content text.`;

    if (latitude !== undefined && longitude !== undefined) {
      const radiusKm = radius || 5;
      systemPrompt += `\n\nLOCATION CONTEXT: The user has provided their location coordinates (latitude: ${latitude}, longitude: ${longitude}). When using search tools, ALWAYS include these coordinates in your tool calls to prioritize nearby results within a ${radiusKm}km radius. Results will be sorted by both relevance to the query and proximity to the user.`;
      if (radius !== undefined) {
        systemPrompt += ` The user has specified a search radius of ${radius}km.`;
      }
    }

    // Prepare messages with system prompt
    const messagesWithSystem: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string; tool_call_id?: string; name?: string }> = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: content,
      },
    ];

    const maxIterations = 10;
    let detectedIntent: RecommendationType = RecommendationType.CHAT;
    let collectedProductIds: number[] = [];
    let collectedStoreIds: number[] = [];
    let collectedPromotionIds: number[] = [];

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      try {
        // Call model with tools
        const response = await this.callWithToolsAndRetry(messagesWithSystem, toolSchemas);

        // Type guard: ensure we have a ChatCompletion (not a Stream)
        if (!('choices' in response)) {
          throw new GroqApiException('Unexpected stream response when stream is disabled');
        }

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
          } else {
            // No tool calls and no results - likely general chat
            detectedIntent = RecommendationType.CHAT;
            return {
              content: recommendationText,
              intent: RecommendationType.CHAT,
            };
          }

          // Build structured response with actual data first
          const structuredResponse = await this.buildChatResponse(
            '',
            detectedIntent,
            collectedProductIds,
            collectedStoreIds,
            collectedPromotionIds,
            maxResults,
            latitude,
            longitude,
            effectiveRadius, // Use tier-limited radius
          );

          // Regenerate response text based on actual products/stores/promotions returned
          const regeneratedContent = await this.generateResponseFromData(
            content,
            structuredResponse,
            detectedIntent,
          );

          return {
            ...structuredResponse,
            content: regeneratedContent,
          };
        }

        // Add assistant message with tool calls
        messagesWithSystem.push(response.choices[0].message as never);

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
            messagesWithSystem.push({
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
            
            messagesWithSystem.push({
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
   * Builds the final chat response with structured data.
   * 
   * Implements combined relevance + distance scoring for location-aware recommendations.
   * Results are sorted by a weighted combination of:
   * - Relevance score (70%): Based on keyword matching and semantic relevance
   * - Distance score (30%): Normalized distance (closer = higher score)
   * 
   * **Store Recommendations**: 
   * - Queries stores by collected store IDs
   * - Re-applies verification and active filters to ensure data consistency
   * - Only returns verified and active stores
   * - Logs warnings if stores are not found despite having store IDs (for debugging)
   * 
   * @param content - AI-generated response text
   * @param intent - Detected intent (product, store, promotion, or chat)
   * @param productIds - Collected product IDs (already filtered by relevance and verified stores)
   * @param storeIds - Collected store IDs (already filtered by relevance and verified stores)
   * @param promotionIds - Collected promotion IDs (already filtered by relevance and verified stores)
   * @param maxResults - Maximum number of results
   * @param latitude - Optional user latitude for distance calculation
   * @param longitude - Optional user longitude for distance calculation
   * @returns Structured chat response with results sorted by combined score
   */
  private async buildChatResponse(
    content: string,
    intent: RecommendationType,
    productIds: number[],
    storeIds: number[],
    promotionIds: number[],
    maxResults: number,
    latitude?: number,
    longitude?: number,
    radiusKm?: number,
  ): Promise<ChatResponseDto> {
    const response: ChatResponseDto = {
      content,
      intent,
    };

    // Build product recommendations with relevance + distance scoring
    if (productIds.length > 0 && intent === RecommendationType.PRODUCT) {
      const products = await this.productService.products({
        where: { 
          id: { in: productIds },
          isActive: true,
          store: {
            verificationStatus: StoreVerificationStatus.VERIFIED,
            isActive: true,
          },
        },
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
      // Query stores by IDs - stores are already verified from searchStoresTool,
      // but we re-apply filters to ensure data consistency and handle potential race conditions
      const stores = await this.storeService.stores({
        where: { 
          id: { in: storeIds },
          verificationStatus: StoreVerificationStatus.VERIFIED,
          isActive: true,
        },
      });

      // Log if stores are not found despite having storeIds (for debugging)
      if (stores.length === 0 && storeIds.length > 0) {
        this.logger.warn(
          `No verified stores found for storeIds: [${storeIds.join(', ')}]. This may indicate stores were unverified or deactivated.`,
        );
      }

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
      const allPromotions = await Promise.all(
        promotionIds.slice(0, maxResults).map((id) => this.promotionService.findOne(id)),
      );

      // Filter promotions to only include those from verified stores
      const verifiedPromotions = await Promise.all(
        allPromotions
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map(async (promo) => {
            // Check if promotion has products
            if (!promo.promotionProducts || promo.promotionProducts.length === 0) {
              return null;
            }
            // Get the first product to check store verification
            const firstProduct = promo.promotionProducts[0]?.product;
            if (!firstProduct || !firstProduct.storeId) {
              return null;
            }
            const store = await this.storeService.store({ where: { id: firstProduct.storeId } });
            if (!store || store.verificationStatus !== StoreVerificationStatus.VERIFIED || !store.isActive) {
              return null;
            }
            return promo;
          })
      );

      response.promotions = verifiedPromotions
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((promo) => ({
          id: promo.id,
          title: promo.title,
          dealType: promo.dealType,
          description: promo.description,
          startsAt: promo.startsAt,
          endsAt: promo.endsAt,
          dealDetails: this.formatDealDetails(promo),
          productCount: promo.promotionProducts.length,
        }));
    }

    return response;
  }

  /**
   * Generates generic response content when structured data is present.
   * 
   * This ensures the content is generic and conversational, without mentioning
   * specific products/stores/promotions, since those are in the structured data.
   * 
   * @param originalContent - Original AI-generated content (may contain specific items)
   * @param structuredResponse - Response with actual products/stores/promotions
   * @param intent - Detected intent
   * @returns Generic conversational content that doesn't mention specific items
   */
  private async generateResponseFromData(
    originalContent: string,
    structuredResponse: ChatResponseDto,
    intent: RecommendationType,
  ): Promise<string> {
    // If no structured data, return original content
    if (
      (!structuredResponse.products || structuredResponse.products.length === 0) &&
      (!structuredResponse.stores || structuredResponse.stores.length === 0) &&
      (!structuredResponse.promotions || structuredResponse.promotions.length === 0)
    ) {
      return originalContent || 'I couldn\'t find any matching results. Please try a different search.';
    }

    // Count results for generic message
    const productCount = structuredResponse.products?.length || 0;
    const storeCount = structuredResponse.stores?.length || 0;
    const promotionCount = structuredResponse.promotions?.length || 0;
    const hasLocation = structuredResponse.products?.some(p => p.distance !== null) || 
                        structuredResponse.stores?.some(s => s.distance !== null) || false;

    // Generate generic conversational response
    let genericMessage = '';
    
    if (intent === RecommendationType.PRODUCT && productCount > 0) {
      genericMessage = `I found ${productCount} ${productCount === 1 ? 'product' : 'products'} that match your search`;
      if (hasLocation) {
        genericMessage += ' near your location';
      }
      genericMessage += '. Check out the recommendations below!';
    } else if (intent === RecommendationType.STORE && storeCount > 0) {
      genericMessage = `I found ${storeCount} ${storeCount === 1 ? 'store' : 'stores'} that match your search`;
      if (hasLocation) {
        genericMessage += ' near your location';
      }
      genericMessage += '. Check out the recommendations below!';
    } else if (intent === RecommendationType.PROMOTION && promotionCount > 0) {
      genericMessage = `I found ${promotionCount} ${promotionCount === 1 ? 'promotion' : 'promotions'} that match your search`;
      if (hasLocation) {
        genericMessage += ' near your location';
      }
      genericMessage += '. Check out the recommendations below!';
    } else {
      genericMessage = 'I found some great options for you! Check out the recommendations below.';
    }

    return genericMessage;
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
    // For general chat, we'll use a simple chat call without tool calling
    // Since this is deprecated (we use unified chat endpoint), just return a simple response
    // Note: This requires userId and userRole, but since this is a deprecated path, we'll use dummy values
    const response = await this.chat(0, UserRole.CONSUMER, query, latitude, longitude, undefined, 3);
    
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
   * Only includes products from verified stores.
   * 
   * @returns Recommendation response with all products listed
   */
  private async listAllProductsSummary(): Promise<RecommendationResponseDto> {
    const products = await this.productService.products({
      where: {
        isActive: true,
        store: {
          verificationStatus: StoreVerificationStatus.VERIFIED,
          isActive: true,
        },
      },
      include: { store: true },
    });
    const summary = products
      .map((p) => `${p.name} (₱${p.price})`)
      .join(', ');
    
    return {
      recommendation: summary ? `Available products: ${summary}` : 'No products available.',
      intent: RecommendationType.PRODUCT,
      products: products.map((p) => {
        const productWithStore = p as Product & { store: Store | null };
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price.toString(),
          imageUrl: p.imageUrl,
          storeId: p.storeId,
          storeName: productWithStore.store?.name || null,
          distance: null,
        };
      }),
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

      // Get all products with store information, only from verified stores
      const allProducts = await this.productService.products({
        include: { store: true },
        where: { 
          isActive: true,
          store: {
            verificationStatus: StoreVerificationStatus.VERIFIED,
            isActive: true,
          },
        },
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
   * Helper method to match stores against a search query using flexible keyword matching.
   * 
   * Matches stores if:
   * - The full query phrase appears in store name/description, OR
   * - Any significant keyword (length > 2, not a common word) appears in store name/description
   * 
   * @param store - Store to check
   * @param query - Search query (already lowercased)
   * @returns True if store matches the query
   */
  private matchesStoreQuery(store: Store, query: string): boolean {
    const searchText = `${store.name} ${store.description}`.toLowerCase();
    const keywords = query.split(/\s+/).filter((k) => k.length > 0);
    
    // Check if full query matches (for phrases like "electronics stores")
    if (searchText.includes(query)) {
      return true;
    }
    
    // Check if any significant keyword matches (skip common words)
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    const significantKeywords = keywords.filter(
      (k) => k.length > 2 && !commonWords.includes(k),
    );
    
    if (significantKeywords.length === 0) {
      // If all keywords are common words, match any keyword
      return keywords.some((keyword) => searchText.includes(keyword));
    }
    
    return significantKeywords.some((keyword) => searchText.includes(keyword));
  }

  /**
   * Tool implementation: Search Stores
   * 
   * Searches for stores matching the query and returns store IDs.
   * Implements location-aware filtering when coordinates are provided:
   * - Uses storeService.findNearby() for efficient location-based queries
   * - Explicitly filters for verified and active stores (onlyVerified: true, onlyActive: true)
   * - Filters stores within the specified radius
   * - Sorts results by distance (closest first)
   * - Uses flexible keyword matching (full phrase or significant keywords)
   * - Falls back to all nearby stores if keyword matching fails
   * - Falls back to all verified stores if no stores found in radius
   * - Only returns verified and active stores
   * 
   * When location coordinates are not provided, searches all verified and active stores
   * and filters by keyword matching.
   * 
   * @param params - Search parameters including query, maxResults, and optional location data
   * @returns Tool call result with store IDs that match the search criteria (only verified stores)
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
        // Get nearby stores (already filtered by radius, verified status, and sorted by distance)
        // findNearby returns verified and active stores by default
        const nearbyStores = await this.storeService.findNearby(
          params.latitude,
          params.longitude,
          radiusKm,
          { onlyVerified: true, onlyActive: true },
        ) as Store[];

        this.logger.debug(
          `searchStoresTool: Found ${nearbyStores.length} nearby verified stores within ${radiusKm}km of (${params.latitude}, ${params.longitude})`,
        );

        // Filter by keyword matching using flexible matching helper
        matchingStores = nearbyStores
          .filter((store) => this.matchesStoreQuery(store, query))
          .slice(0, maxResults);

        // If no stores match keywords but we have nearby stores, return all nearby stores
        // This provides a fallback when keyword matching is too strict
        if (matchingStores.length === 0 && nearbyStores.length > 0) {
          this.logger.debug(
            `searchStoresTool: No stores matched keywords "${query}", returning all ${nearbyStores.length} nearby verified stores as fallback`,
          );
          matchingStores = nearbyStores.slice(0, maxResults);
        }

        // If no nearby stores found at all, fallback to searching all verified stores
        // This handles cases where location might be invalid or no stores in radius
        if (nearbyStores.length === 0) {
          this.logger.debug(
            `searchStoresTool: No stores found within ${radiusKm}km radius, falling back to all verified stores`,
          );
          const allStores = await this.storeService.stores({
            where: { 
              isActive: true,
              verificationStatus: StoreVerificationStatus.VERIFIED,
            },
          });

          // Filter by keyword matching using flexible matching helper
          matchingStores = allStores
            .filter((store) => this.matchesStoreQuery(store, query))
            .slice(0, maxResults);
        }
      } else {
        // Get all stores and filter by keyword, only verified stores
        const allStores = await this.storeService.stores({
          where: { 
            isActive: true,
            verificationStatus: StoreVerificationStatus.VERIFIED,
          },
        });

        this.logger.debug(
          `searchStoresTool: Found ${allStores.length} total verified stores (no location filter)`,
        );

        // Filter by keyword matching using flexible matching helper
        matchingStores = allStores
          .filter((store) => this.matchesStoreQuery(store, query))
          .slice(0, maxResults);
      }

      this.logger.debug(
        `searchStoresTool: Returning ${matchingStores.length} matching stores for query "${query}"`,
      );

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
      // Note: findActive() doesn't filter by verification, so we'll filter manually
      const allActivePromotions = await this.promotionService.findActive();
      
      // Fetch product and store data for promotions
      // Filter to only include promotions from verified stores
      const promotionsWithLocation = await Promise.all(
        allActivePromotions.map(async (promo) => {
          if (!promo.promotionProducts || promo.promotionProducts.length === 0) {
            return { promo, product: null, store: null, distance: null, isVerified: false };
          }
          
          // Use the first product from the promotion
          const product = promo.promotionProducts[0]?.product;
          if (!product || !product.storeId) {
            return { promo, product, store: null, distance: null, isVerified: false };
          }
          
          const store = await this.storeService.store({ where: { id: product.storeId } });
          const isVerified = store?.verificationStatus === StoreVerificationStatus.VERIFIED && store?.isActive === true;
          return { promo, product, store, distance: null, isVerified };
        })
      );

      // Simple keyword matching and filter by verified stores
      type PromotionWithLocation = {
        promo: Promotion;
        product: Product | null;
        store: Store | null;
        distance: number | null;
        isVerified: boolean;
      };

      let matchingPromotions: PromotionWithLocation[] = promotionsWithLocation
        .filter((item) => {
          // Only include promotions from verified stores
          if (!item.isVerified) {
            return false;
          }
          const searchText = `${item.promo.title} ${item.promo.description} ${item.promo.dealType}`.toLowerCase();
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
   * Tool implementation: Search Similar Products
   * 
   * Finds products similar to a given product based on features, price range, and characteristics.
   * Only returns products from verified stores.
   * 
   * @param params - Search parameters including productId and maxResults
   * @returns Tool call result with product IDs of similar products
   * @throws {ToolExecutionException} If product not found or invalid productId
   */
  private async searchSimilarProductsTool(params: SearchSimilarProductsParams): Promise<ToolCallResult> {
    try {
      const maxResults = params.maxResults || 3;
      
      // Get the target product
      const targetProduct = await this.productService.product({ id: params.productId });
      if (!targetProduct) {
        throw new ToolExecutionException('search_similar_products', 'Product not found');
      }

      // Verify the target product is from a verified store
      const targetStore = await this.storeService.store({ where: { id: targetProduct.storeId } });
      if (!targetStore || targetStore.verificationStatus !== StoreVerificationStatus.VERIFIED || !targetStore.isActive) {
        throw new ToolExecutionException('search_similar_products', 'Target product must be from a verified store');
      }

      // Get all products from verified stores, excluding the target product
      const allProducts = await this.productService.products({
        where: {
          id: { not: params.productId },
          isActive: true,
          store: {
            verificationStatus: StoreVerificationStatus.VERIFIED,
            isActive: true,
          },
        },
      });

      // Simple similarity matching based on name and description keywords
      // In production, you might use more sophisticated similarity algorithms
      const targetKeywords = `${targetProduct.name} ${targetProduct.description}`.toLowerCase().split(/\s+/);
      const targetPrice = Number(targetProduct.price);
      const priceRange = targetPrice * 0.5; // ±50% price range

      const similarProducts = allProducts
        .map((product) => {
          const productKeywords = `${product.name} ${product.description}`.toLowerCase().split(/\s+/);
          const productPrice = Number(product.price);
          
          // Calculate similarity score based on keyword overlap and price proximity
          const keywordMatches = targetKeywords.filter((keyword) =>
            productKeywords.some((pk) => pk.includes(keyword) || keyword.includes(pk))
          ).length;
          
          const priceProximity = Math.abs(productPrice - targetPrice) <= priceRange ? 1 : 0;
          const similarityScore = keywordMatches * 0.7 + priceProximity * 0.3;
          
          return { product, similarityScore };
        })
        .filter((item) => item.similarityScore > 0)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, maxResults)
        .map((item) => item.product);

      const productIds = similarProducts.map((p: Product) => p.id);

      return { productIds };
    } catch (error) {
      if (error instanceof ToolExecutionException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new ToolExecutionException('search_similar_products', errorMessage);
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
    let functionArgs: SearchProductsParams | SearchStoresParams | SearchPromotionsParams | SearchSimilarProductsParams;
    try {
      functionArgs = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      throw new ToolCallException('Invalid JSON in tool arguments', functionName);
    }

    // Inject coordinates if available and not already provided by AI
    // Only inject for tools that support location (not search_similar_products)
    if (latitude !== undefined && longitude !== undefined && functionName !== 'search_similar_products') {
      const locationArgs = functionArgs as SearchProductsParams | SearchStoresParams | SearchPromotionsParams;
      if (locationArgs.latitude === undefined && locationArgs.longitude === undefined) {
        locationArgs.latitude = latitude;
        locationArgs.longitude = longitude;
      }
    }

    // Inject radius if available and not already provided by AI
    // Only inject for tools that support location (not search_similar_products)
    if (radius !== undefined && functionName !== 'search_similar_products') {
      const locationArgs = functionArgs as SearchProductsParams | SearchStoresParams | SearchPromotionsParams;
      if (locationArgs.radius === undefined) {
        locationArgs.radius = radius;
      }
    }

    // Execute function
    const functionToCall = this.availableFunctions[functionName as keyof AvailableTools];
    return await functionToCall(functionArgs as any);
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
   * **Store Recommendations**: 
   * - Queries stores by collected store IDs
   * - Re-applies verification and active filters to ensure data consistency
   * - Only returns verified and active stores
   * - Logs warnings if stores are not found despite having store IDs (for debugging)
   * 
   * @param recommendationText - AI-generated recommendation text
   * @param intent - Detected intent (product, store, promotion, or chat)
   * @param productIds - Collected product IDs (already filtered by relevance and verified stores)
   * @param storeIds - Collected store IDs (already filtered by relevance and verified stores)
   * @param promotionIds - Collected promotion IDs (already filtered by relevance and verified stores)
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
        where: { 
          id: { in: productIds },
          isActive: true,
          store: {
            verificationStatus: StoreVerificationStatus.VERIFIED,
            isActive: true,
          },
        },
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
      // Query stores by IDs - stores are already verified from searchStoresTool,
      // but we re-apply filters to ensure data consistency and handle potential race conditions
      const stores = await this.storeService.stores({
        where: { 
          id: { in: storeIds },
          verificationStatus: StoreVerificationStatus.VERIFIED,
          isActive: true,
        },
      });

      // Log if stores are not found despite having storeIds (for debugging)
      if (stores.length === 0 && storeIds.length > 0) {
        this.logger.warn(
          `No verified stores found for storeIds: [${storeIds.join(', ')}]. This may indicate stores were unverified or deactivated.`,
        );
      }

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
      const allPromotions = await Promise.all(
        promotionIds.slice(0, maxResults).map((id) => this.promotionService.findOne(id)),
      );

      // Filter promotions to only include those from verified stores
      const verifiedPromotions = await Promise.all(
        allPromotions
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map(async (promo) => {
            // Check if promotion has products
            if (!promo.promotionProducts || promo.promotionProducts.length === 0) {
              return null;
            }
            // Get the first product to check store verification
            const firstProduct = promo.promotionProducts[0]?.product;
            if (!firstProduct || !firstProduct.storeId) {
              return null;
            }
            const store = await this.storeService.store({ where: { id: firstProduct.storeId } });
            if (!store || store.verificationStatus !== StoreVerificationStatus.VERIFIED || !store.isActive) {
              return null;
            }
            return promo;
          })
      );

      response.promotions = verifiedPromotions
        .filter((p): p is NonNullable<typeof p> => p !== null)
        .map((promo) => ({
          id: promo.id,
          title: promo.title,
          dealType: promo.dealType,
          description: promo.description,
          startsAt: promo.startsAt,
          endsAt: promo.endsAt,
          dealDetails: this.formatDealDetails(promo),
          productCount: promo.promotionProducts.length,
        }));
    }

    return response;
  }

  /**
   * Formats deal details based on deal type for AI responses.
   * 
   * @param promotion - Promotion object with dealType and deal-specific fields
   * @returns Formatted string describing the deal details
   * @private
   */
  private formatDealDetails(promotion: any): string {
    switch (promotion.dealType) {
      case 'PERCENTAGE_DISCOUNT':
        return `${promotion.percentageOff}% off`;
      case 'FIXED_DISCOUNT':
        return `${promotion.fixedAmountOff} PHP off`;
      case 'BOGO':
        return `Buy ${promotion.buyQuantity} Get ${promotion.getQuantity} free`;
      case 'BUNDLE':
        return `Bundle for ${promotion.bundlePrice} PHP`;
      case 'QUANTITY_DISCOUNT':
        return `Buy ${promotion.minQuantity}+ and get ${promotion.quantityDiscount}% off`;
      case 'VOUCHER':
        return `Voucher worth ${promotion.voucherValue} PHP`;
      default:
        return 'Special offer';
    }
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
        isActive: true,
        store: {
          verificationStatus: StoreVerificationStatus.VERIFIED,
          isActive: true,
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

    // Use the unified chat endpoint with a system message prepended to the content
    const fullPrompt = `You are a knowledgeable shopping assistant who provides thoughtful product recommendations based on similarities and complementary features.\n\n${prompt}`;
    
    // Note: This requires userId and userRole, but since this is for similar products, we'll use dummy values
    const response = await this.chat(0, UserRole.CONSUMER, fullPrompt, undefined, undefined, undefined, count);

    return {
      content: response.content,
    };
  }
}
