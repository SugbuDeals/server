import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Post()
  @ApiBody({ type: CreatePromotionDto })
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionService.create(createPromotionDto);
  }

  @Get()
  findAll() {
    return this.promotionService.findAll();
  }

  @Get('active')
  findActive() {
    return this.promotionService.findActive();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.findOne(id);
  }

  @Patch(':id')
  @ApiBody({ type: UpdatePromotionDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionService.update(id, updatePromotionDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.remove(id);
  }
}
