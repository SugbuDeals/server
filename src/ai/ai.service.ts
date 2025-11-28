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

  async getRecommendationsFromQuery(query: string, count: number = 3) {
    // If user asks to see all products, bypass AI and return the catalog summary
    if (this.isShowAllProductsQuery(query)) {
      return this.listAllProductsSummary();
    }

    // Default: single product recommendation with one similar alternative in one paragraph
    return this.generateProductRecommendations(query, 1);
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
      .map((p) => `- ${p.name}: ${p.description} (Price: ₱${p.price})`)
      .join('\n');
  }

  async generateProductRecommendations(
    userPreferences: string,
    count: number = 3,
  ) {
    // First get all available products
    const products = await this.productService.products({});

    const productsList = await this.formatProductsForAI(products);

    const prompt = `Context — products:
${productsList}

User preferences: "${userPreferences}"

Task: Recommend exactly 1 primary product and include exactly 1 similar alternative.
Style: One concise paragraph only. No lists, no headings, no extra lines.
Required content in this order within the SAME paragraph:
- Primary: {product name}, brief justification (≤18 words), Price: ₱{price}, Distance: {km or "unknown"}.
- Similar: {product name}, Price: ₱{price} (one short reason ≤8 words).
Output rules:
- Output a single paragraph only. No numbering, no bullets, no extra lines.`;

    const response = await this.chat([
      {
        role: 'system',
        content:
          'You are a knowledgeable shopping assistant who provides thoughtful, personalized product recommendations.',
      },
      { role: 'user', content: prompt },
    ]);

    return response;
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
