import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Groq } from 'groq-sdk';
import { ProductService } from '../product/product.service';
import { Product } from 'generated/prisma';

@Injectable()
export class AiService implements OnModuleInit {
  private groq: Groq;

  constructor(
    private configService: ConfigService,
    private productService: ProductService,
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
