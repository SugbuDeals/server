import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateStoreDTO } from './dto/createStore.dto';

@Controller('store')
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Get()
  async stores() {
    return this.storeService.stores({});
  }

  @Get(':id')
  async store(@Param('id') id: string) {
    return this.storeService.store({ where: { id: Number(id) } });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createStoreDTO: CreateStoreDTO) {
    return this.storeService.create({
      data: createStoreDTO,
    });
  }
}
