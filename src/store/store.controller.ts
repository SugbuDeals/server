import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { StoreService } from './store.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateStoreDTO } from './dto/createStore.dto';
import { UpdateStoreDTO } from './dto/updateStore.dto';
import { Prisma } from 'generated/prisma';

@ApiTags('Stores')
@Controller('store')
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List stores' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search stores by name or description',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  @ApiOkResponse({ description: 'Returns list of stores' })
  async findManyStores(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    const searchQuery = search && search.length > 0 ? search : undefined;

    // Validate pagination parameters
    if (skipNum !== undefined && (isNaN(skipNum) || skipNum < 0)) {
      throw new BadRequestException('Skip must be a non-negative number');
    }
    if (takeNum !== undefined && (isNaN(takeNum) || takeNum <= 0)) {
      throw new BadRequestException('Take must be a positive number');
    }

    return this.storeService.stores({
      skip: skipNum,
      take: takeNum,
      where: searchQuery
        ? {
            OR: [
              {
                name: {
                  contains: searchQuery,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: searchQuery,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : undefined,
    });
  }

  @Get('nearby')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Find stores near a location',
    description:
      'Returns stores within a specified radius of the given coordinates, sorted by distance. Uses the Haversine formula to calculate distances in kilometers.',
  })
  @ApiQuery({
    name: 'latitude',
    required: true,
    type: Number,
    description: 'Latitude of the search center point',
    example: 10.3157,
  })
  @ApiQuery({
    name: 'longitude',
    required: true,
    type: Number,
    description: 'Longitude of the search center point',
    example: 123.8854,
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    type: Number,
    description: 'Search radius in kilometers (default: 10km, max: 50 results)',
    example: 5,
  })
  @ApiOkResponse({
    description:
      'Returns array of stores with calculated distance field, ordered by proximity',
  })
  findNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius?: string,
  ) {
    return this.storeService.findNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseFloat(radius) : 10,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get store by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Returns a store' })
  async findUniqueStore(@Param('id') id: string) {
    return this.storeService.store({ where: { id: Number(id) } });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a store' })
  @ApiBody({ type: CreateStoreDTO })
  async createStore(@Body() createStoreDTO: CreateStoreDTO) {
    const { ownerId, ...body } = createStoreDTO;

    return this.storeService.create({
      data: {
        ...body,
        owner: {
          connect: {
            id: ownerId,
          },
        },
      },
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update a store' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateStoreDTO })
  async updateStore(
    @Param('id') id: string,
    @Body() updateStoreDTO: UpdateStoreDTO,
  ) {
    const { name, description, verificationStatus, ownerId } = updateStoreDTO;

    return this.storeService.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        verificationStatus,
        owner: ownerId
          ? {
              connect: {
                id: ownerId,
              },
            }
          : undefined,
      },
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a store' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Store deleted' })
  async deleteStore(@Param('id') id: string) {
    return this.storeService.delete({
      where: { id: Number(id) },
    });
  }
}
