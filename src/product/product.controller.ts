import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateProductDTO } from './dto/createProduct.dto';
import { UpdateProductDTO } from './dto/updateProduct.dto';
import { UpdateProductStatusDTO } from './dto/updateProductStatus.dto';
import { Prisma, UserRole } from 'generated/prisma';
import { PayloadDTO } from 'src/auth/dto/payload.dto';

@ApiTags('Products')
@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List products with optional filters' })
  @ApiQuery({ name: 'storeId', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiOkResponse({ description: 'Returns list of products' })
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get product by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Returns a product' })
  async findUniqueProduct(@Param('id') id: string) {
    return this.productService.product({ id: Number(id) });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a product' })
  @ApiBody({ type: CreateProductDTO })
  async createProduct(@Body() createProductDto: CreateProductDTO) {
    const { storeId, categoryId, ...body } = createProductDto;

    return this.productService.createProduct({
      ...body,
      store: {
        connect: { id: storeId },
      },
      category:
        typeof categoryId === 'number'
          ? {
              connect: { id: categoryId },
            }
          : undefined,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateProductDTO })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDTO,
  ) {
    const { categoryId, ...rest } = updateProductDto;
    const data: Prisma.ProductUpdateInput = {
      ...rest,
    };

    if (typeof categoryId === 'number') {
      data.category = {
        connect: { id: categoryId },
      };
    }

    return this.productService.updateProduct({
      where: { id: Number(id) },
      data,
    });
  }

  @Patch(':id/admin-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Admin: enable or disable a product' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateProductStatusDTO })
  @ApiOkResponse({ description: 'Product status updated' })
  async updateProductAdminStatus(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
    @Body() updateProductStatusDto: UpdateProductStatusDTO,
  ) {
    const requestingUser = req.user;
    const productId = Number(id);

    if (!productId || Number.isNaN(productId)) {
      throw new BadRequestException('Invalid product id');
    }

    if (requestingUser.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Only admins can disable products');
    }

    return this.productService.updateProduct({
      where: { id: productId },
      data: {
        isActive: updateProductStatusDto.isActive,
      },
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Product deleted' })
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct({ id: Number(id) });
  }
}
