import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk';
import { ProductService } from '../product/product.service';
import { PromotionService } from '../promotion/promotion.service';
import { Product, Store } from 'generated/prisma';
import { StoreService } from '../store/store.service';

@Injectable()
export class AiService implements OnModuleInit {
  private groq: Groq;

  constructor(
    private configService: ConfigService,
    private productService: ProductService,
    private promotionService: PromotionService,
    private storeService: StoreService,
  ) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not set in environment variables');
    }
    this.groq = new Groq({ apiKey });
  }

  async getModelName(): Promise<string> {
    return (
      this.configService.get<string>('GROQ_MODEL_NAME') || 'llama2-70b-4096'
    );
  }

  private async classifyRecommendationIntent(query: string): Promise<'product' | 'store' | 'promotion'> {
    const instruction = `You are an AI product recommendation engine designed to accurately interpret and respond to consumer product requests.Your task is to focus solely on the products specifically requested by the user, ensuring that you display only those items that are directly related to the query.1.When a user requests a specific type of product (e.g., "smartwatch"), respond exclusively with items that fall under that exact category.Avoid displaying products from adjacent categories (e.g., do not show phones when the user requests watches).2.If the user requests multiple types of products (e.g., "phones and clothing"), respond with items strictly related to those categories only.Do not include items from unrelated categories (e.g., do not show shoes if the user requests clothing).3.If a requested product is not found in the inventory, inform the user that the product is not available and return an empty response, avoiding any unrelated suggestions.4.Ensure clarity and relevance in your responses, maintaining a user-friendly experience.Example Format: - User Request: "Find me a smartwatch." - Response: [List of smartwatches, if available]- User Request: "Show me phones and clothing." - Response: [List of phones and clothing items, if available]- User Request: "Find me a specific product not in inventory." - Response: "This product is not found." [Return empty response]"${query}"`;

    const res = await this.chat(
      [
        { role: 'system', content: 'You are a precise intent classifier. Respond with one word only.' },
        { role: 'user', content: instruction },
      ],
      { temperature: 0, max_tokens: 5 }
    );
    const label = res?.content?.toLowerCase().trim() || 'product';
    if (label.includes('store') || label.includes('merchant') || label.includes('shop')) return 'store';
    if (
      label.includes('promotion') ||
      label.includes('promo') ||
      label.includes('deal') ||
      label.includes('discount') ||
      label.includes('sale') ||
      label.includes('voucher') ||
      label.includes('coupon')
    )
      return 'promotion';
    return 'product';
  }

  async getRecommendationsFromQuery(
    query: string,
    count: number = 3,
  ) {
    // If user asks to see all products, bypass AI and return the catalog summary
    if (this.isShowAllProductsQuery(query)) {
      return this.listAllProductsSummary();
    }

    // Default: return as many targeted product recommendations as requested (clamped inside helper)
    return this.generateProductRecommendations(
      query,
      count,
    );
  }

  private isShowAllProductsQuery(query: string): boolean {
    const q = (query || '').toLowerCase();
    // Check for variations of "show/see/list all products" queries
    const hasShowAll = (q.includes('show') && q.includes('all') && q.includes('product')) ||
                       (q.includes('show') && q.includes('product') && (q.includes('available') || q.includes('all')));
    const hasSeeAll = q.includes('see') && q.includes('all') && q.includes('product');
    const hasListAll = (q.includes('list') && q.includes('all') && q.includes('product')) ||
                       (q.includes('list') && q.includes('product'));
    const hasBrowse = q.includes('browse') && q.includes('product');
    const isExactMatch = q === 'all products' || q === 'products' || q.trim() === 'all';
    
    return hasShowAll || hasSeeAll || hasListAll || hasBrowse || isExactMatch;
  }

  private async listAllProductsSummary() {
    const products = await this.productService.products({
      include: { store: true, category: true },
    });
    
    if (!products || products.length === 0) {
      return {
        recommendation: 'No products are currently available in our catalog.',
        highlight: 'The catalog is empty at this time.',
        elaboration: 'Please check back later or contact support if you believe this is an error.',
        products: [],
      };
    }

    // Format products for response
    const productsWithDetails = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl || null,
      storeId: product.storeId,
      storeName: product.store?.name || null,
    }));

    // Create a summary recommendation text
    const productList = products
      .map((p, index) => `${index + 1}. ${p.name} — Price: ₱${p.price}`)
      .join(' ');

    return {
      recommendation: `Here are all available products: ${productList}`,
      highlight: `We have ${products.length} product${products.length !== 1 ? 's' : ''} available in our catalog.`,
      elaboration: 'These are all the products currently available across all stores. You can browse through them to find what you\'re looking for.',
      products: productsWithDetails,
    };
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options?: Partial<{ temperature: number; max_tokens: number; top_p: number; stream: boolean; model: string }>,
  ) {
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
    throw new Error('Streaming responses are not supported by chat() helper yet.');
  }

  async generateText(prompt: string) {
    return this.chat([{ role: 'user', content: prompt }]);
  }

  private async formatProductsForAI(products: Product[]): Promise<string> {
    return products
      .map((p) => `- ID: ${p.id}, ${p.name}: ${p.description} (Price: ₱${p.price})`)
      .join('\n');
  }

  /**
   * Apply simple intent-based filtering to ensure only products of the
   * requested type (e.g., watches, not phones) are passed to the AI.
   */
  private filterProductsByIntent(
    userPreferences: string,
    products: Array<Product & { category?: { name: string | null } }>,
  ): Array<Product & { category?: { name: string | null } }> {
    const q = (userPreferences || '').toLowerCase();

    // 1. Define granular, semantic keyword buckets
    const phoneKeywords = [
      'phone',
      'phones',
      'smartphone',
      'smartphones',
      'mobile',
      'mobiles',
      'handset',
      'android phone',
      'ios phone',
      'cellphone',
      'cell phone',
    ];

    const laptopKeywords = [
      'laptop',
      'laptops',
      'notebook',
      'ultrabook',
      'macbook',
      'chromebook',
      'computer',
      'pc',
      'desktop',
      'workstation',
    ];

    const watchKeywords = [
      'watch',
      'watches',
      'smartwatch',
      'smart watch',
      'timer',
      'timepiece',
      'wristwatch',
      'fitness band',
      'fitness tracker',
    ];

    const generalGadgetKeywords = [
      // For broader tech items
      'device',
      'devices',
      'tablet',
      'tablets',
      'camera',
      'cameras',
      'tv',
      'tvs',
      'television',
      'monitor',
      'monitors',
      'electronics',
      'tech',
      'speaker',
      'speakers',
      'headphone',
      'headphones',
      'earbud',
      'earbuds',
      'headset',
      'console',
      'playstation',
      'xbox',
      'nintendo',
      'router',
      'modem',
      'fan',
      'smart home',
      'smart device',
    ];

    const clothingKeywords = [
      'clothes',
      'clothing',
      'clothe',
      'cloth',
      'apparel',
      'fashion',
      'outfit',
      'suit',
      'suits',
      'shirt',
      't-shirt',
      'tshirt',
      'tee',
      'top',
      'blouse',
      'pants',
      'trousers',
      'jeans',
      'shorts',
      'jacket',
      'coat',
      'hoodie',
      'sweater',
      'cardigan',
      'dress',
      'skirt',
      'blazer',
    ];

    const footwearKeywords = [
      'shoe',
      'shoes',
      'sneaker',
      'sneakers',
      'sandal',
      'sandals',
      'boot',
      'boots',
      'heel',
      'heels',
      'flip-flops',
      'flip flops',
    ];

    const jewelryKeywords = [
      'necklace',
      'necklaces',
      'bracelet',
      'bracelets',
      'ring',
      'rings',
      'earring',
      'earrings',
      'jewelry',
      'jewelery',
      'pendant',
      'anklet',
      'brooch',
    ];

    const bagKeywords = [
      'bag',
      'bags',
      'purse',
      'purses',
      'wallet',
      'wallets',
      'backpack',
      'backpacks',
      'satchel',
      'handbag',
      'hand bag',
      'tote',
      'tote bag',
    ];

    // Additional high-level types to improve intent matching
    const beautyKeywords = [
      'beauty',
      'cosmetic',
      'cosmetics',
      'makeup',
      'lipstick',
      'lip gloss',
      'foundation',
      'concealer',
      'mascara',
      'eyeliner',
      'blush',
      'highlighter',
      'bronzer',
    ];

    const skincareKeywords = [
      'skincare',
      'skin care',
      'moisturizer',
      'serum',
      'cleanser',
      'toner',
      'sunscreen',
      'sunblock',
      'face wash',
      'lotion',
      'cream',
    ];

    const homeKeywords = [
      'furniture',
      'sofa',
      'couch',
      'table',
      'desk',
      'chair',
      'stool',
      'bed',
      'mattress',
      'wardrobe',
      'cabinet',
      'shelf',
      'bookshelf',
      'lamp',
      'lighting',
      'rug',
      'carpet',
      'curtain',
      'curtains',
      'home decor',
      'decor',
    ];

    const applianceKeywords = [
      'appliance',
      'appliances',
      'fridge',
      'refrigerator',
      'freezer',
      'microwave',
      'oven',
      'stove',
      'cooktop',
      'dishwasher',
      'washer',
      'washing machine',
      'dryer',
      'vacuum',
      'vacuum cleaner',
      'air conditioner',
      'ac unit',
      'aircon',
    ];

    const toyKeywords = [
      'toy',
      'toys',
      'doll',
      'lego',
      'puzzle',
      'board game',
      'board games',
      'action figure',
      'action figures',
      'rc car',
      'remote control car',
      'plush',
      'stuffed animal',
    ];

    const sportsKeywords = [
      'sport',
      'sports',
      'ball',
      'basketball',
      'football',
      'soccer',
      'volleyball',
      'tennis',
      'racket',
      'bat',
      'helmet',
      'jersey',
      'gym',
      'fitness equipment',
      'dumbbell',
      'treadmill',
      'yoga mat',
    ];

    const bookKeywords = [
      'book',
      'books',
      'novel',
      'novels',
      'comic',
      'comics',
      'manga',
      'textbook',
      'magazine',
    ];

    const groceryKeywords = [
      'grocery',
      'groceries',
      'food',
      'snack',
      'snacks',
      'beverage',
      'drink',
      'drinks',
      'juice',
      'soda',
      'water bottle',
      'cereal',
      'rice',
      'pasta',
      'sauce',
      'coffee',
      'tea',
    ];

    const petKeywords = [
      'pet',
      'pets',
      'dog',
      'dogs',
      'cat',
      'cats',
      'pet food',
      'dog food',
      'cat food',
      'pet toy',
      'pet toys',
      'leash',
      'collar',
      'litter',
      'aquarium',
      'fish tank',
    ];

    const woodKeywords = [
      'wood',
      'wooden',
      'timber',
      'lumber',
      'plywood',
      'hardwood',
      'softwood',
      'oak',
      'pine',
      'cedar',
      'mahogany',
      'teak',
      'walnut',
      'cherry',
      'maple',
      'furniture wood',
      'wood furniture',
      'wooden furniture',
      'wood table',
      'wooden table',
      'wood chair',
      'wooden chair',
      'wood desk',
      'wooden desk',
      'wood shelf',
      'wooden shelf',
    ];

    // 2. Identify requested groups based on user query
    const phoneBrandKeywords = [
      'redmi',
      'xiaomi',
      'samsung',
      'iphone',
      'apple',
      'oppo',
      'vivo',
      'huawei',
      'oneplus',
      'nokia',
      'motorola',
      'realme',
    ];

    // Detect negative phrasing like "except for phones", "without phones", etc.
    const excludePhones = /(except|without|excluding|other than|not including)[^\.]*phone[s]?/i.test(
      q,
    );

    const wantsPhones =
      !excludePhones &&
      (phoneKeywords.some((k) => q.includes(k)) ||
        (phoneBrandKeywords.some((k) => q.includes(k)) && q.includes('phone')));
    const wantsLaptops = laptopKeywords.some((k) => q.includes(k));
    const wantsWatches = watchKeywords.some((k) => q.includes(k));
    const wantsGeneralGadgets = generalGadgetKeywords.some((k) => q.includes(k));

    const wantsClothing = clothingKeywords.some((k) => q.includes(k));
    const wantsFootwear = footwearKeywords.some((k) => q.includes(k));
    const wantsJewelry = jewelryKeywords.some((k) => q.includes(k));
    const wantsBags = bagKeywords.some((k) => q.includes(k));
    const wantsBeauty = beautyKeywords.some((k) => q.includes(k));
    const wantsSkincare = skincareKeywords.some((k) => q.includes(k));
    const wantsHome = homeKeywords.some((k) => q.includes(k));
    const wantsAppliances = applianceKeywords.some((k) => q.includes(k));
    const wantsToys = toyKeywords.some((k) => q.includes(k));
    const wantsSports = sportsKeywords.some((k) => q.includes(k));
    const wantsBooks = bookKeywords.some((k) => q.includes(k));
    const wantsGroceries = groceryKeywords.some((k) => q.includes(k));
    const wantsPets = petKeywords.some((k) => q.includes(k));
    const wantsWood = woodKeywords.some((k) => q.includes(k));

    const requestedGroups = new Set<string>();
    if (wantsPhones) requestedGroups.add('phones');
    if (wantsLaptops) requestedGroups.add('laptops');
    if (wantsWatches) requestedGroups.add('watches');
    if (wantsGeneralGadgets) requestedGroups.add('general_gadgets');
    if (wantsClothing) requestedGroups.add('clothing');
    if (wantsFootwear) requestedGroups.add('footwear');
    if (wantsJewelry) requestedGroups.add('jewelry');
    if (wantsBags) requestedGroups.add('bags');
    if (wantsBeauty) requestedGroups.add('beauty');
    if (wantsSkincare) requestedGroups.add('skincare');
    if (wantsHome) requestedGroups.add('home');
    if (wantsAppliances) requestedGroups.add('appliances');
    if (wantsToys) requestedGroups.add('toys');
    if (wantsSports) requestedGroups.add('sports');
    if (wantsBooks) requestedGroups.add('books');
    if (wantsGroceries) requestedGroups.add('groceries');
    if (wantsPets) requestedGroups.add('pets');
    if (wantsWood) requestedGroups.add('wood');

    // Helper to classify whether a product should be treated as a phone
    const isPhoneProduct = (combined: string): boolean =>
      phoneKeywords.some((k) => combined.includes(k)) ||
      phoneBrandKeywords.some((k) => combined.includes(k));

    // If the user only expressed a negative preference like "except phones",
    // and no positive groups, then show everything EXCEPT phones.
    if (requestedGroups.size === 0 && excludePhones) {
      return products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const catName = (p.category?.name || '').toLowerCase();
        const combined = `${name} ${desc} ${catName}`;
        return !isPhoneProduct(combined);
      });
    }

    // If the user didn't clearly express any preference (e.g., asked "best prices"), let the AI see everything
    // BUT if the query contains specific product-related terms that don't match categories, do text-based filtering
    if (requestedGroups.size === 0) {
      // Generic query verbs that don't indicate a specific product search
      const genericQueryVerbs = ['best', 'cheap', 'price', 'prices', 'show', 'list', 'all', 'everything', 'recommend', 'suggest', 'browse', 'available'];
      // Action verbs that typically precede a product name (e.g., "find me a iPhone")
      const actionVerbs = ['find', 'get', 'search', 'look', 'want', 'need', 'buy', 'purchase'];
      
      // Check if query is a truly generic query (like "show all products", "best prices")
      const isTrulyGeneric = genericQueryVerbs.some(term => q.includes(term)) && 
                             !actionVerbs.some(verb => q.includes(verb));
      
      // If it's a truly generic query without specific product terms, return all products
      if (isTrulyGeneric || q.length < 3) {
        return products;
      }
      
      // Otherwise, it's a specific product search - filter by text matching
      // Remove common action verbs and articles to extract actual product terms
      const stopWords = ['find', 'me', 'a', 'an', 'the', 'for', 'get', 'search', 'look', 'want', 'need', 'buy', 'purchase', 'show', 'list'];
      const queryTerms = q
        .split(/\s+/)
        .filter(term => term.length > 2 && !stopWords.includes(term.toLowerCase()));
      
      // If no meaningful terms after filtering, return all products
      if (queryTerms.length === 0) {
        return products;
      }
      
      // Filter products by matching query terms
      return products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const catName = (p.category?.name || '').toLowerCase();
        const combined = `${name} ${desc} ${catName}`;
        
        // Check if any query term appears in the product
        return queryTerms.some(term => combined.includes(term.toLowerCase()));
      });
    }

    // 3. Filter products: keep only those that match one of the requested groups
    return products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const catName = (p.category?.name || '').toLowerCase();
      const combined = `${name} ${desc} ${catName}`;

      const productGroups: string[] = [];

      // Assign the product to its relevant groups
      if (
        phoneKeywords.some((k) => combined.includes(k)) ||
        (phoneBrandKeywords.some((k) => combined.includes(k)) &&
          requestedGroups.has('phones'))
      ) {
        productGroups.push('phones');
      }
      if (laptopKeywords.some((k) => combined.includes(k))) {
        productGroups.push('laptops');
      }
      if (watchKeywords.some((k) => combined.includes(k))) {
        productGroups.push('watches');
      }
      if (generalGadgetKeywords.some((k) => combined.includes(k))) {
        productGroups.push('general_gadgets');
      }
      if (clothingKeywords.some((k) => combined.includes(k))) {
        productGroups.push('clothing');
      }
      if (footwearKeywords.some((k) => combined.includes(k))) {
        productGroups.push('footwear');
      }
      if (jewelryKeywords.some((k) => combined.includes(k))) {
        productGroups.push('jewelry');
      }
      if (bagKeywords.some((k) => combined.includes(k))) {
        productGroups.push('bags');
      }
      if (beautyKeywords.some((k) => combined.includes(k))) {
        productGroups.push('beauty');
      }
      if (skincareKeywords.some((k) => combined.includes(k))) {
        productGroups.push('skincare');
      }
      if (homeKeywords.some((k) => combined.includes(k))) {
        productGroups.push('home');
      }
      if (applianceKeywords.some((k) => combined.includes(k))) {
        productGroups.push('appliances');
      }
      if (toyKeywords.some((k) => combined.includes(k))) {
        productGroups.push('toys');
      }
      if (sportsKeywords.some((k) => combined.includes(k))) {
        productGroups.push('sports');
      }
      if (bookKeywords.some((k) => combined.includes(k))) {
        productGroups.push('books');
      }
      if (groceryKeywords.some((k) => combined.includes(k))) {
        productGroups.push('groceries');
      }
      if (petKeywords.some((k) => combined.includes(k))) {
        productGroups.push('pets');
      }
      if (woodKeywords.some((k) => combined.includes(k))) {
        productGroups.push('wood');
      }

      if (productGroups.length === 0) {
        // If the product doesn't fit any defined group, exclude it since the user had a specific request
        return false;
      }

      // If the user explicitly excluded phones, drop anything classified as a phone
      if (excludePhones && isPhoneProduct(combined)) {
        return false;
      }

      // Keep the product if it matches at least one of the *specifically requested* groups
      return productGroups.some((g) => requestedGroups.has(g));
    });
  }

  async generateProductRecommendations(
    userPreferences: string,
    count: number = 3,
  ) {
    const normalizedCount = Math.max(1, Math.min(Math.floor(count ?? 3), 50));
    const styleInstruction =
      'Style: Single flowing paragraph with full sentences. Provide vivid yet relevant details for each product.';
    const reasonTemplate =
      '{rank}. {product name} — Price: ₱{price}. {reason ≤40 words}.';

    // First get all available products with store and category information
    const allProducts = await this.productService.products({
      include: { store: true, category: true },
    });

    // Filtering happens here to keep only relevant products!
    const products = this.filterProductsByIntent(userPreferences, allProducts);
    
    // Check if any products remain after filtering. Return an empty structure if not found.
    if (!products.length) {
      return {
        recommendation: 'The requested products could not be found.',
        products: [],
      };
    }

    const productsList = await this.formatProductsForAI(products);

    const prompt = `Context — products (this is the ONLY catalog you are allowed to use):
${productsList}

User preferences: "${userPreferences}"

Task: Recommend exactly ${normalizedCount} distinct products that best match the user.

Hard rules:
- You MUST ONLY recommend products that appear in the context list above. Do NOT invent new products or brands.
- The context list is already filtered based on the user request (for example: only phones, only clothing, or "except phones").
- NEVER recommend or mention products that do not appear in the context.
- If multiple categories are requested (e.g., phones AND clothing), include only items that match at least one of those types as reflected in the context.
- If the user excluded a type (e.g., "except phones"), do NOT mention or recommend those excluded types at all.

${styleInstruction}
Format: For each product, use this structure in order and separate items with a single space:
${reasonTemplate}
After the product paragraph, add two line breaks followed by:
Recommendation rationale: {≤40 words explaining why the top choice (usually #1) best fits the user. Mention the product name and speak directly to the user using "you".}
Then add another blank line followed by "Elaboration:" and one paragraph (≤80 words) expanding on how the rest of the products compare or how to choose among them. This elaboration must also address the user in second person ("you", "your").

IMPORTANT: After the paragraph, add a JSON object on a new line with this exact format:
{"productIds": [id_1, id_2, ..., id_${normalizedCount}]}
The JSON array must list the products in the same order you mentioned them.`;

    const response = await this.chat(
      [
        {
          role: 'system',
          content:
            'You are a highly precise shopping assistant. You MUST strictly obey the rules given in the user message, and you MUST only recommend products that appear in the provided context list. Never hallucinate or introduce products that are not in the context. Always include the JSON object with productIds after your recommendation.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.4 },
    );

    const recommendationText = response?.content || '';

    const recommendationSection = recommendationText
      .split(/\{[\s\S]*"productIds"[\s\S]*\}/)[0]
      .trim();

    // Extract product IDs from JSON in the response first
    let productIds: number[] = [];
    try {
      const jsonMatch = recommendationText.match(/\{[\s\S]*"productIds"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);
        productIds = jsonData.productIds || [];
      }
    } catch (error) {
      console.error('Error parsing product IDs from AI response:', error);
    }

    // Check if the AI indicates the requested product does not exist
    // Only trust this if we have no product IDs AND the message is very clear
    const notFoundHints = [
      /no\b.*available/i,
      /not available/i,
      /could not find/i,
      /won'?t find/i,
      /\bnone\b.*price:\s*₱?0/i,
      /does not exist/i,
      /not found/i,
      /unavailable/i,
    ];

    const aiSaysNotFound = notFoundHints.some((re) =>
      re.test(recommendationSection),
    );

    // If not enough product IDs found, try to extract from product names
    if (productIds.length < normalizedCount) {
      for (const product of products) {
        if (
          recommendationText.includes(product.name) &&
          !productIds.includes(product.id)
        ) {
          productIds.push(product.id);
          if (productIds.length >= normalizedCount) break;
        }
      }
    }

    // Only return "not found" if AI says so AND we still have no product IDs after extraction attempts
    // AND we have products available (meaning the filter worked but AI couldn't match)
    // If we have no products at all after filtering, that was already handled above
    if (aiSaysNotFound && productIds.length === 0 && products.length > 0) {
      // If still no products found and AI clearly says not found, return empty
      // But only if the query seems very specific (not a generic "show all" query)
      const isGenericQuery = /show|list|all|available|everything/i.test(userPreferences);
      if (!isGenericQuery) {
        return {
          recommendation:
            'We could not find the exact product you are looking for in our catalog.',
          highlight:
            'The item you requested is currently not available, so we are not recommending alternatives at this time.',
          elaboration:
            'This specific product is not yet offered by any store in the system. You may want to check back later or adjust your search once similar items become available.',
          products: [],
        };
      }
      // For generic queries, fall through to show available products even if AI says not found
    }

    // Still short? fill with remaining catalog items to honor requested count
    // BUT only if we have at least one product ID from the AI (meaning it actually recommended something)
    if (productIds.length > 0 && productIds.length < normalizedCount) {
      for (const product of products) {
        if (!productIds.includes(product.id)) {
          productIds.push(product.id);
          if (productIds.length >= normalizedCount) break;
        }
      }
    }

    // Deduplicate while preserving order and limit to normalizedCount
    const uniqueProductIds = Array.from(
      new Set(productIds),
    ).slice(0, normalizedCount);

    const productsById = new Map(products.map((p) => [p.id, p]));
    const recommendedProducts = uniqueProductIds
      .map((id) => productsById.get(id))
      .filter((p): p is Product => Boolean(p));

    // Prepare final product payload
    const productsWithDetails = recommendedProducts.map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl || null,
      storeId: product.storeId,
      storeName: product.store?.name || null,
    }));

    let recommendationBody = recommendationSection;
    let highlight: string | undefined;
    let elaboration: string | undefined;

    const rationaleMatch =
      recommendationSection.match(
        /Recommendation rationale:\s*([\s\S]*?)(?:\n\s*\n|Elaboration:|$)/i,
      );
    if (rationaleMatch) {
      recommendationBody = recommendationSection
        .slice(0, rationaleMatch.index)
        .trim();
      highlight = rationaleMatch[1].trim();
    }

    const elaborationMatch =
      recommendationSection.match(/Elaboration:\s*([\s\S]*)$/i);
    if (elaborationMatch) {
      elaboration = elaborationMatch[1].trim();
      if (!rationaleMatch) {
        recommendationBody = recommendationSection
          .split(/Elaboration:/i)[0]
          .trim();
      }
    }

    // If we have no concrete products to show, override with a clear "not available" message
    if (productsWithDetails.length === 0) {
      return {
        recommendation:
          'We could not find the exact product you are looking for in our catalog.',
        highlight:
          'The item you requested is currently not available, so we are not recommending alternatives at this time.',
        elaboration:
          'This specific product is not yet offered by any store in the system. You may want to check back later or adjust your search once similar items become available.',
        products: [],
      };
    }

    // Build a clean, non-repeating recommendation paragraph based on the
    // unique products we actually return, so the text matches the payload.
    const autoRecommendation = productsWithDetails
      .map(
        (product: any, index: number) =>
          `${index + 1}. ${product.name} — Price: ₱${product.price}.`,
      )
      .join(' ');

    return {
      recommendation: autoRecommendation,
      ...(highlight ? { highlight } : {}),
      ...(elaboration ? { elaboration } : {}),
      products: productsWithDetails,
    };
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
      throw new Error('Product not found');
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