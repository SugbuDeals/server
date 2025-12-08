/**
 * Tool Schema Types
 * 
 * Defines the JSON schemas for Groq local tool calling.
 * These schemas describe the tools available to the AI model and guide
 * the model on when and how to use each tool.
 * 
 * Following Groq best practices:
 * - Clear, descriptive tool names and descriptions
 * - Detailed parameter descriptions to help the model provide correct arguments
 * - Explicit guidance on when to use each tool
 * 
 * @see https://console.groq.com/docs/tool-use/local-tool-calling
 */

/**
 * JSON Schema for tool parameters
 * 
 * Defines the structure and validation rules for tool parameters.
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
 * 
 * Describes a single tool function that the AI can call.
 * The description field is critical - the model uses it to decide when to use the tool.
 */
export interface ToolFunctionSchema {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

/**
 * Complete tool schema for Groq API
 * 
 * The complete schema format expected by Groq's tool calling API.
 */
export interface ToolSchema {
  type: 'function';
  function: ToolFunctionSchema;
}

/**
 * Search Products Tool Schema
 * 
 * Tool for searching and retrieving product recommendations.
 * 
 * Use this tool when:
 * - User asks about products, items, goods, or merchandise
 * - User mentions specific product categories (e.g., "laptops", "smartphones", "clothing")
 * - User asks "what products", "show me products", "find products"
 * - User mentions product features, price ranges, or specifications
 * 
 * Do NOT use this tool for:
 * - General questions or conversation (use chat mode instead)
 * - Questions about stores (use search_stores instead)
 * - Questions about deals or discounts (use search_promotions instead)
 * - Finding similar products to a specific product (use search_similar_products instead)
 * 
 * @example
 * User: "I'm looking for budget mechanical keyboards"
 * → Call search_products with query: "budget mechanical keyboard"
 * 
 * @example
 * User: "What smartphones do you have under 500?"
 * → Call search_products with query: "smartphones under 500"
 */
export const searchProductsToolSchema: ToolSchema = {
  type: 'function',
  function: {
    name: 'search_products',
    description: 'Searches for products that match user preferences and returns product IDs. Use this tool when the user asks about products, items, goods, merchandise, or specific product categories. The tool searches product names and descriptions for matching keywords. When user coordinates (latitude/longitude) are provided, results are filtered to products from verified stores within the specified radius and sorted by both relevance and proximity. Only products from verified stores are returned. Always include the user\'s query as-is in the query parameter, and include location coordinates if available.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query describing what products the user is looking for. Include the user\'s exact words or keywords from their request. Examples: "budget mechanical keyboard", "smartphones under 500", "laptops for gaming", "wireless headphones". Include product names, features, price ranges, categories, or any specifications mentioned by the user.',
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of products to return. Range: 1-10. Default is 3 if not specified. Use a higher number (5-10) when the user asks for "many" or "all" results, or when they specify a count.',
          minimum: 1,
          maximum: 10,
        },
        latitude: {
          type: 'number',
          description: 'User\'s latitude coordinate for location-based filtering. Only include this if the user has provided their location or asks for "nearby" products. When provided together with longitude, results are filtered to products from stores within the specified radius. Must be between -90 and 90. Always provide both latitude and longitude together, never just one.',
          minimum: -90,
          maximum: 90,
        },
        longitude: {
          type: 'number',
          description: 'User\'s longitude coordinate for location-based filtering. Only include this if the user has provided their location or asks for "nearby" products. When provided together with latitude, results are filtered to products from stores within the specified radius. Must be between -180 and 180. Always provide both latitude and longitude together, never just one.',
          minimum: -180,
          maximum: 180,
        },
        radius: {
          type: 'number',
          description: 'Search radius in kilometers for location filtering. Valid values: 5, 10, or 15. Defaults to 5km if not specified. Only used when latitude and longitude are provided. Use 5km for "nearby" or "close", 10km for "within area", and 15km for "wider area" searches.',
          minimum: 5,
          maximum: 15,
        },
      },
      required: ['query'],
    },
  },
};

/**
 * Search Stores Tool Schema
 * 
 * Tool for searching and retrieving store recommendations.
 * 
 * Use this tool when:
 * - User asks about stores, shops, sellers, merchants, or retailers
 * - User asks "where can I buy", "find stores", "show me shops"
 * - User mentions store types, brands, or specialties
 * - User asks about "nearby stores" or "stores near me"
 * 
 * Do NOT use this tool for:
 * - General questions or conversation (use chat mode instead)
 * - Questions about specific products (use search_products instead)
 * - Questions about deals or discounts (use search_promotions instead)
 * 
 * @example
 * User: "Where can I find electronics stores?"
 * → Call search_stores with query: "electronics stores"
 * 
 * @example
 * User: "Show me nearby clothing shops"
 * → Call search_stores with query: "clothing shops", latitude/longitude, radius
 */
export const searchStoresToolSchema: ToolSchema = {
  type: 'function',
  function: {
    name: 'search_stores',
    description: 'Searches for stores that match user preferences and returns store IDs. Use this tool when the user asks about shops, sellers, merchants, retailers, brands, or places to buy from. The tool searches store names and descriptions for matching keywords. When user coordinates (latitude/longitude) are provided, results are filtered to verified stores within the specified radius and sorted by both relevance and proximity. Only verified stores are returned. Always include the user\'s query as-is in the query parameter, and include location coordinates if available or if the user asks for "nearby" stores.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query describing what stores the user is looking for. Include the user\'s exact words or keywords from their request. Examples: "electronics stores", "clothing shops", "bookstores", "grocery stores", "hardware stores". Include store types, specialties, brands, or any features mentioned by the user.',
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of stores to return. Range: 1-10. Default is 3 if not specified. Use a higher number (5-10) when the user asks for "many" or "all" results, or when they specify a count.',
          minimum: 1,
          maximum: 10,
        },
        latitude: {
          type: 'number',
          description: 'User\'s latitude coordinate for location-based filtering. Always include this if the user has provided their location or asks for "nearby" or "close" stores. When provided together with longitude, results are filtered to stores within the specified radius. Must be between -90 and 90. Always provide both latitude and longitude together, never just one.',
          minimum: -90,
          maximum: 90,
        },
        longitude: {
          type: 'number',
          description: 'User\'s longitude coordinate for location-based filtering. Always include this if the user has provided their location or asks for "nearby" or "close" stores. When provided together with latitude, results are filtered to stores within the specified radius. Must be between -180 and 180. Always provide both latitude and longitude together, never just one.',
          minimum: -180,
          maximum: 180,
        },
        radius: {
          type: 'number',
          description: 'Search radius in kilometers for location filtering. Valid values: 5, 10, or 15. Defaults to 5km if not specified. Only used when latitude and longitude are provided. Use 5km for "nearby" or "close", 10km for "within area", and 15km for "wider area" searches.',
          minimum: 5,
          maximum: 15,
        },
      },
      required: ['query'],
    },
  },
};

/**
 * Search Promotions Tool Schema
 * 
 * Tool for searching and retrieving active promotion and deal recommendations.
 * 
 * Use this tool when:
 * - User asks about deals, discounts, promotions, sales, or special offers
 * - User mentions "on sale", "discounted", "promotion", "coupon", "voucher"
 * - User asks "what deals", "show me discounts", "any sales"
 * - User asks about percentage off, price reductions, or special offers
 * 
 * Do NOT use this tool for:
 * - General questions or conversation (use chat mode instead)
 * - Questions about specific products (use search_products instead)
 * - Questions about stores (use search_stores instead)
 * 
 * @example
 * User: "What discounts do you have on smartphones?"
 * → Call search_promotions with query: "discounts smartphones"
 * 
 * @example
 * User: "Show me sales near me"
 * → Call search_promotions with query: "sales", latitude/longitude, radius
 */
export const searchPromotionsToolSchema: ToolSchema = {
  type: 'function',
  function: {
    name: 'search_promotions',
    description: 'Searches for active promotions, deals, discounts, vouchers, coupons, or sales that match user preferences and returns promotion IDs. Use this tool when the user asks about deals, discounts, promotions, sales, special offers, or price reductions. The tool searches promotion titles, descriptions, and types for matching keywords. When user coordinates (latitude/longitude) are provided, results are filtered to promotions from verified stores within the specified radius and sorted by both relevance and proximity. Only promotions from verified stores are returned. Always include the user\'s query as-is in the query parameter, and include location coordinates if available or if the user asks for "nearby" deals.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query describing what promotions or deals the user is looking for. Include the user\'s exact words or keywords from their request. Examples: "discounts on smartphones", "summer sale", "electronics deals", "20% off", "promotions on clothing". Include product categories, discount types, deal descriptions, or any keywords mentioned by the user related to promotions.',
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of promotions to return. Range: 1-10. Default is 3 if not specified. Use a higher number (5-10) when the user asks for "many" or "all" results, or when they specify a count.',
          minimum: 1,
          maximum: 10,
        },
        latitude: {
          type: 'number',
          description: 'User\'s latitude coordinate for location-based filtering. Always include this if the user has provided their location or asks for "nearby" or "close" deals. When provided together with longitude, results are filtered to promotions from verified stores within the specified radius. Must be between -90 and 90. Always provide both latitude and longitude together, never just one.',
          minimum: -90,
          maximum: 90,
        },
        longitude: {
          type: 'number',
          description: 'User\'s longitude coordinate for location-based filtering. Always include this if the user has provided their location or asks for "nearby" or "close" deals. When provided together with latitude, results are filtered to promotions from verified stores within the specified radius. Must be between -180 and 180. Always provide both latitude and longitude together, never just one.',
          minimum: -180,
          maximum: 180,
        },
        radius: {
          type: 'number',
          description: 'Search radius in kilometers for location filtering. Valid values: 5, 10, or 15. Defaults to 5km if not specified. Only used when latitude and longitude are provided. Use 5km for "nearby" or "close", 10km for "within area", and 15km for "wider area" searches.',
          minimum: 5,
          maximum: 15,
        },
      },
      required: ['query'],
    },
  },
};

/**
 * Search Similar Products Tool Schema
 * 
 * Tool for finding products similar to a given product.
 * 
 * Use this tool when:
 * - User asks for "similar products", "alternatives", "other options like this"
 * - User mentions a specific product ID and asks for similar items
 * - User asks "what else is like this product" or "show me alternatives"
 * - User wants to compare or find substitutes for a product
 * 
 * Do NOT use this tool for:
 * - General product searches (use search_products instead)
 * - Questions about stores (use search_stores instead)
 * - Questions about deals (use search_promotions instead)
 * 
 * @example
 * User: "Show me products similar to product 42"
 * → Call search_similar_products with productId: 42
 * 
 * @example
 * User: "What are alternatives to this laptop?"
 * → Call search_similar_products with productId from context
 */
export const searchSimilarProductsToolSchema: ToolSchema = {
  type: 'function',
  function: {
    name: 'search_similar_products',
    description: 'Finds products similar to a given product and returns product IDs. Use this tool when the user asks for similar products, alternatives, or other options like a specific product. The tool analyzes product features, price range, and characteristics to find similar items. Only products from verified stores are returned. Always include the product ID that the user is asking about.',
    parameters: {
      type: 'object',
      properties: {
        productId: {
          type: 'integer',
          description: 'The ID of the product to find similar items for. Extract this from the user\'s query or conversation context. Must be a valid product ID.',
          minimum: 1,
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of similar products to return. Range: 1-10. Default is 3 if not specified. Use a higher number (5-10) when the user asks for "many" or "all" similar products.',
          minimum: 1,
          maximum: 10,
        },
      },
      required: ['productId'],
    },
  },
};

/**
 * Array of all available tool schemas for the AI agent
 * 
 * These tools are provided to the Groq API for local tool calling.
 * The AI model uses these schemas to understand when and how to call each tool.
 * 
 * Following Groq best practices:
 * - Limited to 4 tools (optimal range: 3-5 tools per request)
 * - Clear descriptions guide the model on tool selection
 * - Structured parameters with detailed descriptions
 * 
 * @see https://console.groq.com/docs/tool-use/local-tool-calling
 */
export const toolSchemas: ToolSchema[] = [
  searchProductsToolSchema,
  searchStoresToolSchema,
  searchPromotionsToolSchema,
  searchSimilarProductsToolSchema,
];

