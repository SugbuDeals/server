/**
 * Tool Implementation Types
 * 
 * Defines TypeScript types for tool function implementations used in Groq local tool calling.
 * All types are strictly typed with no 'any' types to ensure type safety.
 * 
 * @see https://console.groq.com/docs/tool-use/local-tool-calling
 */

/**
 * Parameters for search_products tool
 * 
 * Used when the AI calls the search_products tool to find product recommendations.
 * 
 * @property query - Search query describing products to find
 * @property maxResults - Maximum number of results (1-10, default: 3)
 * @property latitude - Optional user latitude for location filtering (-90 to 90)
 * @property longitude - Optional user longitude for location filtering (-180 to 180)
 * @property radius - Optional search radius in kilometers (5, 10, or 15, default: 5)
 */
export interface SearchProductsParams {
  query: string;
  maxResults?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

/**
 * Parameters for search_stores tool
 * 
 * Used when the AI calls the search_stores tool to find store recommendations.
 * 
 * @property query - Search query describing stores to find
 * @property maxResults - Maximum number of results (1-10, default: 3)
 * @property latitude - Optional user latitude for location filtering (-90 to 90)
 * @property longitude - Optional user longitude for location filtering (-180 to 180)
 * @property radius - Optional search radius in kilometers (5, 10, or 15, default: 5)
 */
export interface SearchStoresParams {
  query: string;
  maxResults?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

/**
 * Parameters for search_promotions tool
 * 
 * Used when the AI calls the search_promotions tool to find promotion recommendations.
 * 
 * @property query - Search query describing promotions to find
 * @property maxResults - Maximum number of results (1-10, default: 3)
 * @property latitude - Optional user latitude for location filtering (-90 to 90)
 * @property longitude - Optional user longitude for location filtering (-180 to 180)
 * @property radius - Optional search radius in kilometers (5, 10, or 15, default: 5)
 */
export interface SearchPromotionsParams {
  query: string;
  maxResults?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

/**
 * Parameters for search_similar_products tool
 * 
 * Used when the AI calls the search_similar_products tool to find products similar to a given product.
 * 
 * @property productId - ID of the product to find similar items for
 * @property maxResults - Maximum number of similar products to return (1-10, default: 3)
 */
export interface SearchSimilarProductsParams {
  productId: number;
  maxResults?: number;
}

/**
 * Result from a tool call execution
 * 
 * Structured return type for tool implementations. Each tool returns
 * the appropriate ID array based on what was searched.
 * 
 * @property productIds - Array of product IDs (from search_products or search_similar_products)
 * @property storeIds - Array of store IDs (from search_stores)
 * @property promotionIds - Array of promotion IDs (from search_promotions)
 * @property error - Error message if tool execution failed
 */
export interface ToolCallResult {
  productIds?: number[];
  storeIds?: number[];
  promotionIds?: number[];
  error?: string;
}

/**
 * Tool function signature for search_products
 * 
 * Type definition for the search_products tool implementation function.
 */
export type SearchProductsTool = (params: SearchProductsParams) => Promise<ToolCallResult>;

/**
 * Tool function signature for search_stores
 * 
 * Type definition for the search_stores tool implementation function.
 */
export type SearchStoresTool = (params: SearchStoresParams) => Promise<ToolCallResult>;

/**
 * Tool function signature for search_promotions
 * 
 * Type definition for the search_promotions tool implementation function.
 */
export type SearchPromotionsTool = (params: SearchPromotionsParams) => Promise<ToolCallResult>;

/**
 * Tool function signature for search_similar_products
 * 
 * Type definition for the search_similar_products tool implementation function.
 */
export type SearchSimilarProductsTool = (params: SearchSimilarProductsParams) => Promise<ToolCallResult>;

/**
 * Map of available tool functions
 * 
 * Maps tool names to their implementation functions.
 * Used by the AI service to execute tool calls from the Groq API.
 */
export interface AvailableTools {
  search_products: SearchProductsTool;
  search_stores: SearchStoresTool;
  search_promotions: SearchPromotionsTool;
  search_similar_products: SearchSimilarProductsTool;
}

/**
 * Tool call from Groq API
 * 
 * Represents a tool call request from the Groq API during local tool calling.
 * The arguments are provided as a JSON string that must be parsed.
 * 
 * @property id - Unique identifier for this tool call
 * @property type - Always 'function' for function tool calls
 * @property function.name - Name of the tool to call
 * @property function.arguments - JSON string of tool parameters
 */
export interface GroqToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Union type of all tool parameter types
 * 
 * Used for type-safe tool argument parsing.
 */
export type ToolParams = SearchProductsParams | SearchStoresParams | SearchPromotionsParams | SearchSimilarProductsParams;

