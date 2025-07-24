import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ProductService } from './product.service';
import { Product as ProductModel } from 'generated/prisma';
import { CreateProductDTO } from './dto/createProduct.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get(':id')
  async getProductById(@Param('id') id: string): Promise<ProductModel | null> {
    return this.productService.product({ id: Number(id) });
  }

  @Get()
  async getProducts(
    @Param('searchString') searchString: string,
  ): Promise<ProductModel[]> {
    return this.productService.products({
      where: {
        name: {
          contains: searchString,
        },
      },
    });
  }

  @Post()
  async createProduct(
    @Body() createProductDTO: CreateProductDTO,
  ): Promise<ProductModel> {
    const { name, description, price, stock, storeId } = createProductDTO;
    return this.productService.createProduct({
      name,
      description,
      price,
      stock,
      Store: {
        connect: {
          id: storeId,
        },
      },
    });
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string): Promise<ProductModel> {
    return this.productService.deleteProduct({ id: Number(id) });
  }
}
