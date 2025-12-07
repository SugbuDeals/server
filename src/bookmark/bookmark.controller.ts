import {
  Body,
  Controller,
  Delete,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { BookmarkService } from './bookmark.service';
import { ListBookmarksDto, StoreBookmarkDto } from './dto/store-bookmark.dto';
import { ProductBookmarkDto } from './dto/product-bookmark.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PayloadDTO } from 'src/auth/dto/payload.dto';

/**
 * Bookmark Controller
 * 
 * Handles HTTP requests for bookmark management operations.
 * Provides endpoints for bookmarking/unbookmarking stores and products,
 * and listing user's bookmarks.
 * 
 * All operations are scoped to the authenticated user - users can only
 * manage their own bookmarks.
 */
@ApiTags('Bookmarks')
@Controller('bookmarks')
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  /**
   * Lists all store bookmarks for the authenticated user.
   * 
   * Returns bookmarks with full store information, ordered by creation date (newest first).
   * 
   * @param req - Request object containing authenticated user information
   * @param body - Pagination parameters (currently not used, but kept for API consistency)
   * @returns Array of store bookmarks with store details
   */
  @Post('stores/list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'List user bookmarked stores',
    description: 'Retrieves all store bookmarks for the authenticated user, including full store information. Results are ordered by creation date (newest first).'
  })
  @ApiOkResponse({ 
    description: 'Returns store bookmarks for the user',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          userId: { type: 'number' },
          storeId: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          store: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              description: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBody({
    type: ListBookmarksDto,
    examples: {
      default: {
        summary: 'List first page',
        value: { take: 10, skip: 0 },
      },
    },
  })
  async listMyStoreBookmarks(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: ListBookmarksDto,
  ) {
    return this.bookmarkService.listStoreBookmarks(req.user.sub);
  }

  /**
   * Creates a bookmark for a store.
   * 
   * Users will receive notifications when the bookmarked store adds new products.
   * 
   * @param req - Request object containing authenticated user information
   * @param body - Bookmark data containing store ID
   * @returns Created bookmark object
   * @throws {PrismaClientKnownRequestError} If bookmark already exists or store not found
   */
  @Post('stores')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Bookmark a store',
    description: 'Creates a bookmark for a store. The user will receive notifications when the store adds new products. If the store is already bookmarked, an error will be returned.'
  })
  @ApiBody({
    type: StoreBookmarkDto,
    examples: {
      default: {
        summary: 'Bookmark store 42',
        value: { storeId: 42 },
      },
    },
  })
  @ApiCreatedResponse({ 
    description: 'Store bookmarked successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        userId: { type: 'number' },
        storeId: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ 
    description: 'Store already bookmarked or store not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 }
      }
    }
  })
  async bookmarkStore(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: StoreBookmarkDto,
  ) {
    return this.bookmarkService.bookmarkStore(req.user.sub, body.storeId);
  }

  /**
   * Removes a store bookmark.
   * 
   * @param req - Request object containing authenticated user information
   * @param body - Bookmark data containing store ID
   * @returns Deleted bookmark object
   * @throws {PrismaClientKnownRequestError} If bookmark doesn't exist
   */
  @Delete('stores')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Remove store bookmark',
    description: 'Removes a bookmark for a store. The user will no longer receive notifications for this store.'
  })
  @ApiBody({
    type: StoreBookmarkDto,
    examples: {
      default: {
        summary: 'Unbookmark store 42',
        value: { storeId: 42 },
      },
    },
  })
  @ApiOkResponse({ 
    description: 'Store bookmark removed successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        userId: { type: 'number' },
        storeId: { type: 'number' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ 
    description: 'Bookmark not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 }
      }
    }
  })
  async unbookmarkStore(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: StoreBookmarkDto,
  ) {
    return this.bookmarkService.unbookmarkStore(req.user.sub, body.storeId);
  }

  /**
   * Lists all product bookmarks for the authenticated user.
   * 
   * Returns bookmarks with full product information, ordered by creation date (newest first).
   * 
   * @param req - Request object containing authenticated user information
   * @param body - Pagination parameters (currently not used, but kept for API consistency)
   * @returns Array of product bookmarks with product details
   */
  @Post('products/list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'List user bookmarked products',
    description: 'Retrieves all product bookmarks for the authenticated user, including full product information. Results are ordered by creation date (newest first).'
  })
  @ApiOkResponse({ 
    description: 'Returns product bookmarks for the user',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          userId: { type: 'number' },
          productId: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          product: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              price: { type: 'number' },
              stock: { type: 'number' }
            }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBody({
    type: ListBookmarksDto,
    examples: {
      default: {
        summary: 'List first page',
        value: { take: 10, skip: 0 },
      },
    },
  })
  async listMyProductBookmarks(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: ListBookmarksDto,
  ) {
    return this.bookmarkService.listProductBookmarks(req.user.sub);
  }

  /**
   * Creates a bookmark for a product.
   * 
   * Users will receive notifications when the bookmarked product has:
   * - Price changes
   * - Stock changes (back in stock or low stock)
   * - New promotions created
   * 
   * @param req - Request object containing authenticated user information
   * @param body - Bookmark data containing product ID
   * @returns Created bookmark object
   * @throws {PrismaClientKnownRequestError} If bookmark already exists or product not found
   */
  @Post('products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Bookmark a product',
    description: 'Creates a bookmark for a product. The user will receive notifications for price changes, stock updates, and new promotions. If the product is already bookmarked, an error will be returned.'
  })
  @ApiBody({
    type: ProductBookmarkDto,
    examples: {
      default: {
        summary: 'Bookmark product 99',
        value: { productId: 99 },
      },
    },
  })
  @ApiCreatedResponse({ 
    description: 'Product bookmarked successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        userId: { type: 'number' },
        productId: { type: 'number' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ 
    description: 'Product already bookmarked or product not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 }
      }
    }
  })
  async bookmarkProduct(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: ProductBookmarkDto,
  ) {
    return this.bookmarkService.bookmarkProduct(req.user.sub, body.productId);
  }

  /**
   * Removes a product bookmark.
   * 
   * @param req - Request object containing authenticated user information
   * @param body - Bookmark data containing product ID
   * @returns Deleted bookmark object
   * @throws {PrismaClientKnownRequestError} If bookmark doesn't exist
   */
  @Delete('products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Remove product bookmark',
    description: 'Removes a bookmark for a product. The user will no longer receive notifications for this product.'
  })
  @ApiBody({
    type: ProductBookmarkDto,
    examples: {
      default: {
        summary: 'Unbookmark product 99',
        value: { productId: 99 },
      },
    },
  })
  @ApiOkResponse({ 
    description: 'Product bookmark removed successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        userId: { type: 'number' },
        productId: { type: 'number' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ 
    description: 'Bookmark not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 }
      }
    }
  })
  async unbookmarkProduct(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() body: ProductBookmarkDto,
  ) {
    return this.bookmarkService.unbookmarkProduct(req.user.sub, body.productId);
  }
}
