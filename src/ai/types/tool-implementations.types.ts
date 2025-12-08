/**
 * Tool Implementation Types
 * 
 * Defines TypeScript types for tool function implementations.
 */

/**
 * Parameters for search_products tool
 */
export interface SearchProductsParams {
  query: string;
  maxResults?: number;
}

/**
 * Parameters for search_stores tool
 */
export interface SearchStoresParams {
  query: string;
  maxResults?: number;
}

/**
 * Parameters for search_promotions tool
 */
export interface SearchPromotionsParams {
  query: string;
  maxResults?: number;
}

/**
 * Result from a tool call
 */
export interface ToolCallResult {
  productIds?: number[];
  storeIds?: number[];
  promotionIds?: number[];
  error?: string;
}

/**
 * Tool function signature for search_products
 */
export type SearchProductsTool = (params: SearchProductsParams) => Promise<ToolCallResult>;

/**
 * Tool function signature for search_stores
 */
export type SearchStoresTool = (params: SearchStoresParams) => Promise<ToolCallResult>;

/**
 * Tool function signature for search_promotions
 */
export type SearchPromotionsTool = (params: SearchPromotionsParams) => Promise<ToolCallResult>;

/**
 * Map of available tool functions
 */
export interface AvailableTools {
  search_products: SearchProductsTool;
  search_stores: SearchStoresTool;
  search_promotions: SearchPromotionsTool;
}

/**
 * Tool call from Groq API
 */
export interface GroqToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

