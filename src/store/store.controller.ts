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
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { StoreService } from './store.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateStoreDTO } from './dto/createStore.dto';
import { UpdateStoreDTO } from './dto/updateStore.dto';

@ApiTags('Stores')
@Controller('store')
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List stores' })
  @ApiOkResponse({ description: 'Returns list of stores' })
  async findManyStores() {
    return this.storeService.stores({});
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Returns a store' })
  async findUniqueStore(@Param('id') id: string) {
    return this.storeService.store({ where: { id: Number(id) } });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a store' })
  @ApiBody({ type: CreateStoreDTO })
  async createStore(@Body() createStoreDTO: CreateStoreDTO) {
    return this.storeService.create({
      data: createStoreDTO,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a store' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateStoreDTO })
  async updateStore(
    @Param('id') id: string,
    @Body() updateStoreDTO: UpdateStoreDTO,
  ) {
    return this.storeService.update({
      where: { id: Number(id) },
      data: updateStoreDTO,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a store' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Store deleted' })
  async deleteStore(@Param('id') id: string) {
    return this.storeService.delete({
      where: { id: Number(id) },
    });
  }
}
