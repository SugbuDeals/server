import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBearerAuth
} from '@nestjs/swagger';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a promotion' })
  @ApiBody({ type: CreatePromotionDto })
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionService.create(createPromotionDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List promotions' })
  @ApiOkResponse({ description: 'Returns list of promotions' })
  findAll() {
    return this.promotionService.findAll();
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List active promotions' })
  @ApiOkResponse({ description: 'Returns list of active promotions' })
  findActive() {
    return this.promotionService.findActive();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get promotion by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Returns a promotion' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update a promotion' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdatePromotionDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionService.update(id, updatePromotionDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a promotion' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Promotion deleted' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.remove(id);
  }
}
