import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { StoreService } from './store.service';
import { Store as StoreModel } from 'generated/prisma';
import { CreateStoreInput } from './dto/createStore.dto';

@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get(':id')
  async getStoreById(@Param('id') id: string): Promise<StoreModel | null> {
    return this.storeService.store({ id: Number(id) });
  }

  @Get()
  async getStores(
    @Param('searchString') searchString: string,
  ): Promise<StoreModel[]> {
    return this.storeService.stores({
      where: {
        name: {
          contains: searchString,
        },
      },
    });
  }

  @Post()
  async createStore(
    @Body() createStore: CreateStoreInput,
  ): Promise<StoreModel> {
    const { name, description } = createStore;
    return this.storeService.createStore({ name, description });
  }

  @Delete(':id')
  async deleteStore(@Param('id') id: string): Promise<StoreModel> {
    return this.storeService.deleteStore({ id: parseInt(id) });
  }
}
