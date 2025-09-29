import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateProductDTO } from './dto/createProduct.dto';
import { UpdateProductDTO } from './dto/updateProduct.dto';

@ApiTags('Products')
@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}
  
  @Get()
  @ApiQuery({ name: 'storeId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findManyProducts(
    @Query('storeId') storeId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const where: any = {};
    
    if (storeId) {
      where.storeId = Number(storeId);
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    return this.productService.products({ where });
  }

  @Get(':id')
  async findUniqueProduct(@Param('id') id: string) {
    return this.productService.product({ id: Number(id) });
  }

  //@UseGuards(JwtAuthGuard)
  @Post()
  @ApiBody({ type: CreateProductDTO })
  async createProduct(@Body() createProductDto: CreateProductDTO) {
    const { storeId, ...productData } = createProductDto;
    
    return this.productService.createProduct({
      ...productData,
      store: {
        connect: { id: storeId }
      }
    });
  }

  //@UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBody({ type: UpdateProductDTO })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDTO,
  ) {
    return this.productService.updateProduct({
      where: { id: Number(id) },
      data: updateProductDto,
    });
  }

  //@UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct({ id: Number(id) });
  }
}
