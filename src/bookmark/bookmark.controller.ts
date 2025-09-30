import { Body, Controller, Delete, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookmarkService } from './bookmark.service';
import { ListBookmarksDto, StoreBookmarkDto } from './dto/store-bookmark.dto';
import { ProductBookmarkDto } from './dto/product-bookmark.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PayloadDTO } from 'src/auth/dto/payload.dto';

class IdParamDto { id!: number }

class BookmarkTargetDto { id!: number }

@ApiTags('Bookmarks')
@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List user bookmarked stores' })
  @ApiOkResponse({ description: 'Returns store bookmarks for the user' })
  @ApiBody({
    type: ListBookmarksDto,
    examples: {
      default: {
        summary: 'List first page',
        value: { take: 10, skip: 0 },
      },
    },
  })
  @Post('stores/list')
  async listMyStoreBookmarks(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: ListBookmarksDto,
  ) {
    return this.bookmarkService.listStoreBookmarks(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Bookmark a store' })
  @ApiBody({
    type: StoreBookmarkDto,
    examples: {
      default: {
        summary: 'Bookmark store 42',
        value: { storeId: 42 },
      },
    },
  })
  @Post('stores')
  async bookmarkStore(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: StoreBookmarkDto,
  ) {
    return this.bookmarkService.bookmarkStore(req.user.sub, body.storeId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove store bookmark' })
  @ApiBody({
    type: StoreBookmarkDto,
    examples: {
      default: {
        summary: 'Unbookmark store 42',
        value: { storeId: 42 },
      },
    },
  })
  @Delete('stores')
  async unbookmarkStore(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: StoreBookmarkDto,
  ) {
    return this.bookmarkService.unbookmarkStore(req.user.sub, body.storeId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List user bookmarked products' })
  @ApiOkResponse({ description: 'Returns product bookmarks for the user' })
  @ApiBody({
    type: ListBookmarksDto,
    examples: {
      default: {
        summary: 'List first page',
        value: { take: 10, skip: 0 },
      },
    },
  })
  @Post('products/list')
  async listMyProductBookmarks(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: ListBookmarksDto,
  ) {
    return this.bookmarkService.listProductBookmarks(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Bookmark a product' })
  @ApiBody({
    type: ProductBookmarkDto,
    examples: {
      default: {
        summary: 'Bookmark product 99',
        value: { productId: 99 },
      },
    },
  })
  @Post('products')
  async bookmarkProduct(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: ProductBookmarkDto,
  ) {
    return this.bookmarkService.bookmarkProduct(req.user.sub, body.productId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Remove product bookmark' })
  @ApiBody({
    type: ProductBookmarkDto,
    examples: {
      default: {
        summary: 'Unbookmark product 99',
        value: { productId: 99 },
      },
    },
  })
  @Delete('products')
  async unbookmarkProduct(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: ProductBookmarkDto,
  ) {
    return this.bookmarkService.unbookmarkProduct(req.user.sub, body.productId);
  }
}


