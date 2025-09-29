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
    const instruction = `Classify the user's recommendation intent as one of: product, store, promotion.
Return only the single word label with no punctuation.

User query: "${query}"`;

    const res = await this.chat([
      { role: 'system', content: 'You are an intent classification assistant.' },
      { role: 'user', content: instruction },
    ]);
    const label = res?.content?.toLowerCase().trim() || 'product';
    if (label.includes('store')) return 'store';
    if (label.includes('promotion') || label.includes('deal') || label.includes('discount')) return 'promotion';
    return 'product';
  }

  async getRecommendationsFromQuery(query: string, count: number = 3) {
    const intent = await this.classifyRecommendationIntent(query);
    if (intent === 'store') {
      return this.generateStoreRecommendations(query, count);
    }
    if (intent === 'promotion') {
      return this.generatePromotionRecommendations(query, count);
    }
    return this.generateProductRecommendations(query, count);
  }

  async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  ) {
    const completion = await this.groq.chat.completions.create({
      messages,
      model: await this.getModelName(),
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      stream: false,
    });

    return completion.choices[0]?.message;
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

    const prompt = `Given the following list of products:
${productsList}

And considering these user preferences: "${userPreferences}"

Please recommend ${count} products that best match the user's preferences. For each recommendation:
1. Explain why it's a good match
2. Highlight key features that align with the preferences
3. Add a personalized note about how the user might benefit from it

Format the response as a clear, easy-to-read list.`;

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

    const prompt = `Given the following active promotions:
${promotionsList}

And considering these user preferences: "${userPreferences}"

Please recommend ${count} promotions that best match the user's interests. For each recommendation:
1. Explain why it matches the user's preferences
2. Mention the associated product/category if relevant
3. Provide a brief, persuasive benefit statement

Format the response as a clear, easy-to-read list.`;

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

    const prompt = `Given the following list of stores:
${storesList}

And considering these user preferences: "${userPreferences}"

Please recommend ${count} stores that best match the user's interests. For each recommendation:
1. Explain why it matches the user's preferences
2. Mention what the store is known for
3. Provide a short persuasive reason to visit

Format the response as a clear, easy-to-read list.`;

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

    const prompt = `Given this target product:
- ${targetProduct.name}: ${targetProduct.description} (Price: ₱${targetProduct.price})

And this list of other available products:
${productsList}

Please recommend ${count} similar products that a customer might be interested in. For each recommendation:
1. Explain why it's similar to ${targetProduct.name}
2. Highlight the key similarities and differences
3. Explain why a customer might want to consider this alternative

Format the response as a clear, easy-to-read list.`;

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
