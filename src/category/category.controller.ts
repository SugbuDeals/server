import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDTO } from './dto/createCategory.dto';
import { UpdateCategoryDTO } from './dto/updateCategory.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('Categories')
@Controller('category')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List categories' })
  @ApiOkResponse({ description: 'Returns list of categories' })
  async findManyCategories() {
    return this.categoryService.categories({});
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get category by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Returns a category' })
  async findUniqueCategory(@Param('id') id: string) {
    return this.categoryService.category({ id: Number(id) });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a category' })
  @ApiBody({ type: CreateCategoryDTO })
  async createCategory(@Body() createCategoryDTO: CreateCategoryDTO) {
    return this.categoryService.createCategory(createCategoryDTO);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateCategoryDTO })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDTO: UpdateCategoryDTO,
  ) {
    return this.categoryService.updateCategory({
      where: { id: Number(id) },
      data: updateCategoryDTO,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Category deleted' })
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory({ id: Number(id) });
  }
}
