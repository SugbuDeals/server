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
    const instruction = `Task: Classify the user's request into exactly one of these labels:
product | store | promotion

Rules:
- Output only the single label, lowercase, no punctuation or extra text.
- "promotion" includes deals, discounts, vouchers, coupons, sales.
- "store" refers to shops, sellers, merchants, brands, places to buy.
- "product" refers to specific items, goods, categories, or features.

Examples:
"Show me discounts on coffee" -> promotion
"Best shops for laptops" -> store
"Recommend a budget smartphone" -> product

User query: "${query}"`;

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
    latitude?: number,
    longitude?: number,
    detailed: boolean = false,
  ) {
    // If user asks to see all products, bypass AI and return the catalog summary
    if (this.isShowAllProductsQuery(query)) {
      return this.listAllProductsSummary();
    }

    // Default: return as many targeted product recommendations as requested (clamped inside helper)
    return this.generateProductRecommendations(
      query,
      count,
      latitude,
      longitude,
      detailed,
    );
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

  async generateProductRecommendations(
    userPreferences: string,
    count: number = 3,
    latitude?: number,
    longitude?: number,
    detailed: boolean = false,
  ) {
    const normalizedCount = Math.max(1, Math.min(Math.floor(count ?? 3), 5));
    const styleInstruction = detailed
      ? 'Style: Single flowing paragraph with full sentences. Provide vivid yet relevant details for each product.'
      : 'Style: One concise paragraph. No headings or bullet characters.';
    const reasonTemplate = detailed
      ? '{rank}. {product name} — Price: ₱{price}. {reason ≤40 words}.'
      : '{rank}. {product name} — Price: ₱{price}. {reason ≤18 words}.';

    // First get all available products with store information
    const products = await this.productService.products({
      include: { store: true },
    });

    const productsList = await this.formatProductsForAI(products);

    const prompt = `Context — products:
${productsList}

User preferences: "${userPreferences}"

Task: Recommend exactly ${normalizedCount} distinct products that best match the user.
${styleInstruction}
Format: For each product, use this structure in order and separate items with a single space:
${reasonTemplate}
After the product paragraph, add two line breaks followed by:
Recommendation rationale: {≤40 words explaining why the top choice (usually #1) best fits the user. Mention the product name and speak directly to the user using "you".}
${detailed ? '\nThen add another blank line followed by "Elaboration:" and one paragraph (≤80 words) expanding on how the rest of the products compare or how to choose among them. This elaboration must also address the user in second person ("you", "your").' : ''}

IMPORTANT: After the paragraph, add a JSON object on a new line with this exact format:
{"productIds": [id_1, id_2, ..., id_${normalizedCount}]}
The JSON array must list the products in the same order you mentioned them.`;

    const response = await this.chat([
      {
        role: 'system',
        content:
          'You are a knowledgeable shopping assistant who provides thoughtful, personalized product recommendations. Always include the JSON object with productIds after your recommendation.',
      },
      { role: 'user', content: prompt },
    ]);

    const recommendationText = response?.content || '';
    
    // Extract product IDs from JSON in the response
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

    // Still short? fill with remaining catalog items to honor requested count
    if (productIds.length < normalizedCount) {
      for (const product of products) {
        if (!productIds.includes(product.id)) {
          productIds.push(product.id);
          if (productIds.length >= normalizedCount) break;
        }
      }
    }

    const productsById = new Map(products.map((p) => [p.id, p]));
    const recommendedProducts = productIds
      .map((id) => productsById.get(id))
      .filter((p): p is Product => Boolean(p));

    // Calculate distances if location is provided
    const productsWithDistance = await Promise.all(
      recommendedProducts.map(async (product: any) => {
        let distance: number | null = null;
        
        if (latitude && longitude && product.store?.latitude && product.store?.longitude) {
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

    const recommendationSection = recommendationText
      .split(/\{[\s\S]*"productIds"[\s\S]*\}/)[0]
      .trim();

    let recommendationBody = recommendationSection;
    let highlight: string | undefined;
    let elaboration: string | undefined;

    const rationaleMatch = recommendationSection.match(/Recommendation rationale:\s*([\s\S]*?)(?:\n\s*\n|Elaboration:|$)/i);
    if (rationaleMatch) {
      recommendationBody = recommendationSection
        .slice(0, rationaleMatch.index)
        .trim();
      highlight = rationaleMatch[1].trim();
    }

    if (detailed) {
      const elaborationMatch = recommendationSection.match(/Elaboration:\s*([\s\S]*)$/i);
      if (elaborationMatch) {
        elaboration = elaborationMatch[1].trim();
        if (!rationaleMatch) {
          recommendationBody = recommendationSection
            .split(/Elaboration:/i)[0]
            .trim();
        }
      }
    }

    return {
      recommendation: recommendationBody,
      ...(highlight ? { highlight } : {}),
      ...(elaboration ? { elaboration } : {}),
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
