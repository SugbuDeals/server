/**
 * Tool Schema Types
 * 
 * Defines the JSON schemas for Groq tool calling.
 * These schemas describe the tools available to the AI model.
 */

/**
 * JSON Schema for tool parameters
 */
export interface ToolParameterSchema {
  type: string;
  properties?: Record<string, ToolParameterSchema>;
  required?: string[];
  description?: string;
  enum?: string[];
  items?: ToolParameterSchema;
  minimum?: number;
  maximum?: number;
}

/**
 * Tool function schema definition
 */
export interface ToolFunctionSchema {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

/**
 * Complete tool schema for Groq API
 */
export interface ToolSchema {
  type: 'function';
  function: ToolFunctionSchema;
}

/**
 * Search Products Tool Schema
 * 
 * Allows the AI to search for products based on user preferences.
 */
export const searchProductsToolSchema: ToolSchema = {
  type: 'function',
  function: {
    name: 'search_products',
    description: 'Searches for products that match user preferences. Use this when the user asks about products, items, goods, or specific product categories. Returns product IDs that match the search criteria.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query describing what products the user is looking for. Include keywords, features, price range, or category preferences.',
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of products to return (1-10). Default is 3.',
          minimum: 1,
          maximum: 10,
        },
      },
      required: ['query'],
    },
  },
};

/**
 * Search Stores Tool Schema
 * 
 * Allows the AI to search for stores based on user preferences.
 */
export const searchStoresToolSchema: ToolSchema = {
  type: 'function',
  function: {
    name: 'search_stores',
    description: 'Searches for stores that match user preferences. Use this when the user asks about shops, sellers, merchants, brands, or places to buy from. Returns store IDs that match the search criteria.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query describing what stores the user is looking for. Include store type, specialties, location preferences, or features.',
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of stores to return (1-10). Default is 3.',
          minimum: 1,
          maximum: 10,
        },
      },
      required: ['query'],
    },
  },
};

/**
 * Search Promotions Tool Schema
 * 
 * Allows the AI to search for active promotions and deals.
 */
export const searchPromotionsToolSchema: ToolSchema = {
  type: 'function',
  function: {
    name: 'search_promotions',
    description: 'Searches for active promotions, deals, discounts, vouchers, coupons, or sales that match user preferences. Use this when the user asks about deals, discounts, promotions, sales, or special offers.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query describing what promotions or deals the user is looking for. Include product categories, discount preferences, or deal types.',
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of promotions to return (1-10). Default is 3.',
          minimum: 1,
          maximum: 10,
        },
      },
      required: ['query'],
    },
  },
};

/**
 * Array of all available tool schemas
 */
export const toolSchemas: ToolSchema[] = [
  searchProductsToolSchema,
  searchStoresToolSchema,
  searchPromotionsToolSchema,
];

