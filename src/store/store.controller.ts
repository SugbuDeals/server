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
import { StoreService } from './store.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateStoreDTO } from './dto/createStore.dto';
import { UpdateStoreDTO } from './dto/updateStore.dto';

@Controller('store')
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Get()
  async findManyStores() {
    return this.storeService.stores({});
  }

  @Get(':id')
  async findUniqueStore(@Param('id') id: string) {
    return this.storeService.store({ where: { id: Number(id) } });
  }

  //@UseGuards(JwtAuthGuard)
  @Post()
  async createStore(@Body() createStoreDTO: CreateStoreDTO) {
    return this.storeService.create({
      data: createStoreDTO,
    });
  }

  //UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateStore(
    @Param('id') id: string,
    @Body() updateStoreDTO: UpdateStoreDTO,
  ) {
    return this.storeService.update({
      where: { id: Number(id) },
      data: updateStoreDTO,
    });
  }

  //UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteStore(@Param('id') id: string) {
    return this.storeService.delete({
      where: { id: Number(id) },
    });
  }
}
